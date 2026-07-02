import * as Discord from 'discord.js';
import { toMS } from 'type-better-ms';

import { CommandExecutionError, ContextType, CooldownType, Permission, PermissionType } from '../../index.ts';
import { descriptionMaxLength } from '../../utils/constants.ts';
import { CooldownsManager, isCodedError } from '../../utils/index.ts';
import { CommandOption, CommandOptionUninitialized } from '../commandOption/index.ts';
import {
  CommandType, CommandValidationError, cooldownConverter, equal,
  isComponent, isInteraction, isMessage, isSlash, resolveCommandType
} from '../utils.ts';

import type { I18nProvider, Locale, Translator } from '@mephisto5558/i18n';
import type {
  AllContexts, ChatInputCommandInteraction, CommandInteraction, Logger, Message,
  MessageComponentInteraction, OptionsG, commandDoneFn, customPermissionChecksFn
} from '../../index.ts';
import type { CommandOptionConfig } from '../commandOption/utils.ts';
import type { CommandConfig, CommandMention, DeepOptions, ResolvedOption, RunnableReturns } from './utils.ts';

const
  msInSeconds = toMS('1s'),
  CANNOT_SEND_MESSAGE_API_ERR = 50_007;


export class Command<
  const CT extends readonly CommandType[] = readonly [],
  const CTX extends AllContexts = readonly [ContextType.Guild],
  const Options extends OptionsG<CT, CTX> = readonly CommandOptionConfig<CT, CTX>[]
> /* implements ChatInputApplicationCommandData */ {
  name: Lowercase<string>;
  id: `commands.${Command['category']}.${Command['name']}`;

  /* set in `CommandManager` */
  commandId?: [CommandType.Slash] extends NoInfer<CT> ? Snowflake : never;

  /** Currently not used */
  nameLocalizations?: Partial<Record<Locale, Command['name']>>;

  description!: string;
  descriptionLocalizations: Partial<Record<Locale, string>> = {};

  category: Lowercase<string>;

  readonly type = Discord.ApplicationCommandType.ChatInput;

  types: CT;

  usage: Record<'usage' | 'examples', string | undefined> & {};
  usageLocalizations: Partial<Record<Locale, Command<NoInfer<CT>, NoInfer<CTX>>['usage']>> = {};

  aliases: Record<NoInfer<CT>[number], Command['name'][]>;

  cooldowns: Record<CooldownType, number>;

  permissions: Record<PermissionType, Discord.PermissionFlags[keyof Discord.PermissionFlags][]>;

  get defaultMemberPermissions(): Discord.PermissionsBitField['bitfield'] {
    return new Discord.PermissionsBitField(this.permissions[PermissionType.User]).bitfield;
  }

  contexts: CTX;

  disabled: boolean;

  /** Always present if `disabled` is `true` */
  disabledReason: string | undefined;

  noDefer: boolean;
  ephemeralDefer: boolean;

  beta: boolean;

  options: CommandOption<NoInfer<CT>, NoInfer<CTX>>[];

  config = {
    devIds: new Set<Discord.User['id']>(), devOnlyCategories: new Set<Command['category']>(),
    runBetaCommandsOnly: false,
    replyOn: { disabled: true, nonBeta: true },
    messagePrefixesArePreRemoved: false
  };

  mention<
    SubCommandGroupName extends CommandOption['name'] | undefined = undefined,
    SubcommandName extends CommandOption['name'] | undefined = undefined
  >(subcommandGroup?: SubCommandGroupName, subcommand?: SubcommandName): CommandMention<SubCommandGroupName, SubcommandName, NoInfer<CT>> {
    const path = [this.name, subcommandGroup, subcommand].filter(Boolean).join(' ');

    // using `0` here to not break the mention in Discord
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- this is safe */
    return `</${path}:${this.commandId ?? 0}>` as CommandMention<SubCommandGroupName, SubcommandName, NoInfer<CT>>;
  }

  run: (
    this: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<Options>>],
      [CommandType.Component, MessageComponentInteraction<NoInfer<CTX>> & { commandName: Command['name'] }],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    lang: Translator<false, Locale>,
    data: { client: Discord.Client<true>; command: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>> }
  ) => unknown;

  readonly #i18n: I18nProvider;
  readonly #logger: Logger = console;
  readonly #doneFn: commandDoneFn | undefined;
  readonly #cooldownsManager: CooldownsManager;
  readonly #customPermissionChecks: customPermissionChecksFn | undefined;

  /** @internal */
  constructor(
    base: CommandUninitialized<CT, CTX, Options>, i18n: I18nProvider,
    name: Command['name'], category: Command['category'],
    config: {
      logger?: Logger | undefined;
      doneFn?: commandDoneFn | undefined;
      customPermissionChecks?: customPermissionChecksFn | undefined;

      devIds?: Command['config']['devIds'] | undefined;
      devOnlyCategories?: Command['config']['devOnlyCategories'] | undefined;
      runBetaCommandsOnly?: boolean | undefined;
      replyOn?: Partial<Command['config']['replyOn']> | undefined;
      cooldownsManager?: CooldownsManager | undefined;
      messagePrefixesArePreRemoved?: boolean;
    } = {}
  ) {
    this.#cooldownsManager = config.cooldownsManager ?? new CooldownsManager();

    this.run = base.run;
    this.usage = base.usage;
    this.cooldowns = base.cooldowns;
    this.permissions = base.permissions;
    this.contexts = base.contexts;
    this.disabled = base.disabled;
    this.disabledReason = base.disabledReason;
    this.noDefer = base.noDefer;
    this.ephemeralDefer = base.ephemeralDefer;
    this.beta = base.beta;
    this.aliases = base.aliases;
    this.types = base.types;


    this.#i18n = i18n;
    if (config.logger) this.#logger = config.logger;
    if (config.doneFn) this.#doneFn = config.doneFn;
    this.#customPermissionChecks = config.customPermissionChecks?.bind(this as unknown as Command<readonly CommandType[], AllContexts>);

    if (config.devIds) this.config.devIds = config.devIds;
    if (config.devOnlyCategories) this.config.devOnlyCategories = config.devOnlyCategories;
    this.config.runBetaCommandsOnly = !!config.runBetaCommandsOnly;

    this.config.replyOn.disabled = !!config.replyOn?.disabled;
    this.config.replyOn.nonBeta = !!config.replyOn?.nonBeta;
    this.config.messagePrefixesArePreRemoved = !!config.messagePrefixesArePreRemoved;

    this.name = name.toLowerCase();
    this.category = category.toLowerCase();
    this.id = `commands.${this.category}.${this.name}`;

    this.options = base.options.map((e, i) => e.init(i18n, this.id, this.#cooldownsManager, this.#logger, i));

    this.#validate();
    this.#localize();
  }

  #validate(): void {
    if (this.disabled) {
      if (this.disabledReason) return;
      throw new CommandValidationError('A disabled command requires a disabledReason!', this);
    }

    if (!['function', 'async function', 'async run(', 'run('].some(e => String(this.run).startsWith(e)))
      throw new CommandValidationError(`The "run" method of command "${this.id}" is an arrow function! You cannot use arrow functions!`, this);

    CommandOption.validateOptionOrder(this);
  }

  #localize(): void {
    for (const [locale] of this.#i18n.availableLocales) {
      const
        requiredTranslator = this.#i18n.getTranslator({ locale, errorNotFound: true, backupPaths: [this.id] }),
        optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] }),

        // description
        localizedDescription = locale == this.#i18n.config.defaultLocale ? optionalTranslator('description') : requiredTranslator('description');
      if (!localizedDescription) {
        if (!this.disabled)
          this.#logger.warn(`Missing "${locale}" description for command "${this.name}" (${this.id}.description)`);
      }
      else if (localizedDescription.length > descriptionMaxLength && !this.disabled)
        this.#logger.warn(`"${locale}" description for command "${this.name}" (${this.id}.description) is too long (max length is 100)! Slicing.`);

      if (localizedDescription) {
        if (locale == this.#i18n.config.defaultLocale) this.description = localizedDescription.slice(0, descriptionMaxLength);
        else this.descriptionLocalizations[locale] = localizedDescription.slice(0, descriptionMaxLength);
      }

      // usage
      const localizedUsage = {
        usage: this.usage.usage ?? optionalTranslator('usage.usage'),
        examples: this.usage.examples ?? optionalTranslator('usage.examples')
      };

      localizedUsage.usage &&= `{prefix}{cmdName} ${localizedUsage.usage}`.replaceAll('{cmdName}', this.name);
      localizedUsage.examples &&= `{prefix}{cmdName} ${localizedUsage.examples}`.replaceAll('{cmdName}', this.name);

      if (locale == this.#i18n.config.defaultLocale) this.usage = localizedUsage;
      else this.usageLocalizations[locale] = localizedUsage;
    }
  }

  async runWrapper(
    interaction: ThisParameterType<this['run']>,
    i18n: I18nProvider, locale: Locale
  ): Promise<void> {
    const
      wrapperTranslator = i18n.getTranslator({ locale, backupPaths: ['events.command'] }),
      commandTranslator = i18n.getTranslator({ locale, backupPaths: [this.id] }),
      errorKey = await this.#isRunable(interaction, wrapperTranslator);

    if (errorKey === true) return; // already handled by the function
    if (errorKey !== false) {
      return interaction.reply({
        embeds: [new Discord.EmbedBuilder({ description: wrapperTranslator(...errorKey), color: Discord.Colors.Red })],
        flags: Discord.MessageFlags.Ephemeral
      });
    }

    if (isComponent(interaction))
      interaction.commandName = this.name;


    const commandType = resolveCommandType(interaction);
    this.#logger.debug(`Executing ${commandType} command ${this.name}`);

    if (isSlash(interaction) && !this.noDefer && !interaction.replied)
      await interaction.deferReply({ flags: this.ephemeralDefer ? Discord.MessageFlags.Ephemeral : undefined });

    try {
      await this.run.call(interaction, commandTranslator, { client: interaction.client, command: this });
      await this.#doneFn?.call(interaction, this, commandTranslator);
    }
    catch (err) {
      throw new CommandExecutionError(Error.isError(err) ? err.message : JSON.stringify(err), interaction, wrapperTranslator, { cause: err });
    }
  }

  /**
   * @returns the currect cooldown for this command or the subcommand(group) (whichever is higher) in ms.
   * Resets it if it's `0`. */
  #updateCooldowns(interaction: ThisParameterType<this['run']>): number {
    const
      currentCooldowns = [this.#cooldownsManager.update(this.id, interaction, this.cooldowns)],
      { group, subcommand } = this.#getSubcommandNames(interaction) ?? {};

    if (group) {
      const groupOption = this.options.find(e => e.name == group && e.type == Discord.ApplicationCommandOptionType.SubcommandGroup);
      if (groupOption) {
        if (Object.values(groupOption.cooldowns).some(Boolean))
          currentCooldowns.push(groupOption.updateCooldowns(interaction));

        if (subcommand) {
          const subOption = groupOption.options?.find(e => e.name == subcommand && e.type == Discord.ApplicationCommandOptionType.Subcommand);
          if (subOption && Object.values(subOption.cooldowns).some(Boolean))
            currentCooldowns.push(subOption.updateCooldowns(interaction));
        }
      }
    }
    else if (subcommand) {
      const subOption = this.options.find(e => e.name == subcommand && e.type == Discord.ApplicationCommandOptionType.Subcommand);
      if (subOption && Object.values(subOption.cooldowns).some(Boolean))
        currentCooldowns.push(subOption.updateCooldowns(interaction));
    }

    return Math.max(0, ...currentCooldowns);
  }

  #getSubcommandNames(interaction: ThisParameterType<this['run']>): { group: string | undefined; subcommand: string } | undefined {
    if (isSlash(interaction)) {
      if (!interaction.options.getSubcommand(false)) return;
      return { group: interaction.options.getSubcommandGroup(false) ?? undefined, subcommand: interaction.options.getSubcommand(true) };
    }

    if (isComponent(interaction)) return; // todo

    if (isMessage(interaction)) {
      const
        args = interaction.content.split(/\s+/).slice(this.config.messagePrefixesArePreRemoved ? 0 : 1),
        option1 = this.options.find(e => e.name == args[0]);

      if (option1?.type == Discord.ApplicationCommandOptionType.Subcommand) return { group: undefined, subcommand: option1.name };
      if (option1?.type == Discord.ApplicationCommandOptionType.SubcommandGroup) {
        const subcommand = option1.options?.find(e => e.name == args[1] && e.type == Discord.ApplicationCommandOptionType.Subcommand);
        if (subcommand) return { group: option1.name, subcommand: subcommand.name };
      }
    }
  }

  async #permissionChecks(
    interaction: CommandInteraction, author: Discord.User, wrapperTranslator: Translator<false, Locale>
  ): Promise<boolean | RunnableReturns> {
    if (!(interaction.inGuild() && interaction.guild && interaction.channel)) return false;

    const
      botChannelPerms = interaction.guild.members.me ? interaction.channel.permissionsFor(interaction.guild.members.me) : undefined,
      userPermsMissing = interaction.channel.permissionsFor(author)?.missing(this.permissions[PermissionType.User]) ?? [],
      botPermsMissing = botChannelPerms?.missing(this.permissions[PermissionType.Client]);

    if (!botPermsMissing?.length && !userPermsMissing.length) return false;

    const embed = new Discord.EmbedBuilder({
      title: wrapperTranslator('permissionDenied.embedTitle'),
      description: wrapperTranslator(`permissionDenied.embedDescription${botPermsMissing?.length ? 'Bot' : 'User'}`, {
        permissions: (botPermsMissing?.length ? botPermsMissing : userPermsMissing).map(perm => Discord.inlineCode(this.#i18n.__(
          { locale: wrapperTranslator.config.locale ?? wrapperTranslator.defaultConfig.defaultLocale, undefinedNotFound: true },
          `others.Perms.${perm}`
        ) ?? perm)).join(', ')
      }),
      color: Discord.Colors.Red
    });

    if (botChannelPerms?.missing([Permission.SendMessages, Permission.ViewChannel]).length) {
      if (isMessage(interaction) && botChannelPerms.has(Permission.AddReactions))
        void interaction.react('\u274C').then(() => void interaction.react('\u270D\uFE0F'));

      try { await author.send({ content: isMessage(interaction) ? interaction.url : '', embeds: [embed] }); }
      catch (err) {
        if (!isCodedError(err, CANNOT_SEND_MESSAGE_API_ERR)) throw err;
      }
    }
    else if (isInteraction(interaction))
      await (interaction.isRepliable() ? interaction.reply({ embeds: [embed], ephemeral: true }) : interaction.channel.send({ embeds: [embed] }));
    else await interaction.reply({ embeds: [embed] });

    return true;
  }

  async #isRunable(
    interaction: CommandInteraction, wrapperTranslator: Translator<false, Locale>
  ): Promise<RunnableReturns | boolean> {
    const
      author = isInteraction(interaction) ? interaction.user : interaction.author,
      args = isMessage(interaction) ? interaction.content.split(/\s+/).slice(this.config.messagePrefixesArePreRemoved ? 0 : 1) : undefined,
      staticErr = this.#staticRunnableChecks(interaction, author);

    if (staticErr) return staticErr;

    if (interaction.inGuild()) {
      const err = await this.#permissionChecks(interaction, author, wrapperTranslator);
      if (err) return err;
    }

    if (this.#customPermissionChecks) {
      const customErr = await this.#customPermissionChecks(interaction, author, wrapperTranslator);
      if (customErr) return customErr;
    }

    const activeOption = this.#resolveActiveOption(interaction, args);
    for (const option of activeOption ? [activeOption] : this.options) {
      const err = await option.isRunable(interaction, this, wrapperTranslator, args?.slice(activeOption && isMessage(interaction) ? 1 : 0));
      if (err) return err;
    }

    if (!this.config.runBetaCommandsOnly) {
      const cooldown = this.#updateCooldowns(interaction);
      if (cooldown) return ['cooldown', Discord.inlineCode(Math.round(cooldown / msInSeconds).toString())];
    }

    return false;
  }

  #staticRunnableChecks(
    interaction: CommandInteraction, author: Discord.User
  ): RunnableReturns | boolean {
    if (
      this.config.devOnlyCategories.has(this.category) && !this.config.devIds.has(author.id)
      || (isMessage(interaction) && interaction.guild?.members.me?.communicationDisabledUntil)
    ) return true;
    if (this.config.runBetaCommandsOnly && !this.beta) return this.config.replyOn.nonBeta ? ['nonBeta'] : true;
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- validated in #validate() */
    if (this.disabled) return this.config.replyOn.disabled ? ['disabled', this.disabledReason!] : true;

    if (isMessage(interaction) && !this.types.includes(CommandType.Prefix)) return ['slashOnly', this.mention()];

    if (!this.contexts.includes(ContextType.BotDM) && interaction.channel?.type == Discord.ChannelType.DM) return ['guildOnly'];
    if (this.category == 'nsfw' && interaction.channel && (!('nsfw' in interaction.channel) || !interaction.channel.nsfw)) return ['nsfw'];
    return false;
  }

  #resolveActiveOption(
    interaction: CommandInteraction, args: string[] | undefined
  ): CommandOption<NoInfer<CT>, NoInfer<CTX>> | undefined {
    if (isSlash(interaction)) {
      const group = interaction.options.getSubcommandGroup(false);
      if (group) return this.options.find(e => e.name == group);

      const subcommand = interaction.options.getSubcommand(false);
      if (subcommand) return this.options.find(e => e.name == subcommand);
    }
    else {
      return this.options.find(e => (!args || e.name == args[0])
        && [Discord.ApplicationCommandOptionType.Subcommand, Discord.ApplicationCommandOptionType.SubcommandGroup].includes(e.type));
    }
  }

  findOption<
    O extends { name: CommandOption['name']; type?: CommandOption['type'] }
    | { name?: CommandOption['name']; type: CommandOption['type'] } | undefined
  >(
    option?: O,
    interaction?: ThisParameterType<Command<readonly [CommandType.Slash], NoInfer<CTX>>['run']>
  ): IfExtendsStrict<O, undefined, {
    ifTrue: If<IsEmptyArray<Options>, { ifTrue: undefined; ifFalse: CommandOption<NoInfer<CT>, NoInfer<CTX>> }>;
    ifFalse: number extends Options['length']
      ? ResolvedOption<NoInfer<CT>, NoInfer<CTX>, O> | undefined
      : Extract<DeepOptions<Options[number]>, O> extends infer E ? IfExtendsNever<E, {
        ifTrue: undefined;
        ifFalse: ResolvedOption<NoInfer<CT>, NoInfer<CTX>, E>;
      }> : never;
  }> {
    const
      group = interaction?.options.getSubcommandGroup(false),
      subcommand = interaction?.options.getSubcommand(false);

    let options: CommandOption<NoInfer<CT>, NoInfer<CTX>>[] = this.options;
    if (group) options = this.options.find(e => e.name == group)?.options ?? [];
    if (subcommand) options = options.find(e => e.name == subcommand)?.options ?? [];

    return options.find(e => (!option?.name || e.name == option.name) && (!option?.type || e.type == option.type));
  }

  isEqualTo(cmd?: Command<readonly CommandType[], AllContexts> | Discord.ApplicationCommand): boolean {
    if (!cmd) return false;
    if (

      this.name != cmd.name || this.description != cmd.description || this.type != cmd.type
      || this.defaultMemberPermissions != (
        cmd.defaultMemberPermissions instanceof Discord.PermissionsBitField ? cmd.defaultMemberPermissions.bitfield : cmd.defaultMemberPermissions
      )
      || !equal(this.contexts, cmd.contexts)
      || !equal(this.nameLocalizations, cmd.nameLocalizations)
      || !equal(this.descriptionLocalizations, cmd.descriptionLocalizations)
    ) return false;

    if (this.options.length != cmd.options.length) return false;
    if (this.options.length) {
      for (const option of this.options) {
        const other = cmd.options.find(e => e.name == option.name);
        if (!other || !option.isEqualTo(other)) return false;
      }
    }

    return true;
  }

  /** @internal */
  clone(): CommandUninitialized<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>> {
    /* eslint-disable-next-line @typescript-eslint/no-use-before-define -- fine with classes */
    return new CommandUninitialized(this);
  }
}

export class CommandUninitialized<
  const CT extends readonly CommandType[] = readonly [],
  const CTX extends AllContexts = readonly [ContextType.Guild],
  const Options extends OptionsG<CT, CTX> = readonly CommandOptionConfig<CT, CTX>[]
> {
  run: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['run'];
  options: CommandOptionUninitialized<NoInfer<CT>, NoInfer<CTX>>[] = [];
  usage: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['usage'] = { usage: undefined, examples: undefined };
  cooldowns: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['cooldowns'] = Object.fromEntries(Object.values(CooldownType).map(e => [e, 0]));
  permissions: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['permissions'] = {
    ...Object.fromEntries(Object.values(PermissionType).map(e => [e, []])),
    [PermissionType.Client]: [Permission.ViewChannel, Permission.SendMessages],
    [PermissionType.User]: [Permission.SendMessages]
  };

  contexts: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['contexts'] = [ContextType.Guild] as unknown as CTX;
  disabled: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['disabled'] = false;
  noDefer: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['noDefer'] = false;
  ephemeralDefer: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['ephemeralDefer'] = false;
  beta: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['beta'] = false;
  aliases!: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['aliases'];
  types: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['types'] = [] as unknown as CT;
  disabledReason: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['disabledReason'];

  /** @internal */
  constructor(config: Command<CT, CTX, Options>);
  /* eslint-disable-next-line @typescript-eslint/unified-signatures -- TS disagrees */
  constructor(config: CommandConfig<CT, CTX, Options>);
  constructor(config: CommandConfig<CT, CTX, Options> | Command<CT, CTX, Options>) {
    // need to set these specifically for typing
    this.run = config.run;

    if (config instanceof Command) {
      for (const key of Object.getOwnPropertyNames(config) as (keyof typeof this)[]) {
        const descriptor = Object.getOwnPropertyDescriptor(config, key)
          ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(config) as object, key);

        if (!descriptor || descriptor.get || descriptor.writable === false) continue;

        const value = config[key as keyof typeof config];

        if (key == 'options') this.options = (value as typeof config.options).map(opt => opt.clone());
        else if (value && typeof value == 'object' && typeof value != 'function')
          (this as Record<typeof key, unknown>)[key] = Array.isArray(value) ? [...value] : { ...value as Record<string | number | symbol, unknown> };
        else (this as Record<typeof key, unknown>)[key] = value;
      }

      return;
    }

    if ('usage' in config) {
      if (config.usage.usage) this.usage.usage = config.usage.usage;
      if (config.usage.examples) this.usage.examples = config.usage.examples;
    }

    if ('cooldowns' in config) {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TS false positive */
      this.cooldowns = Object.fromEntries(Object.entries(this.cooldowns).map(([k, v]) => cooldownConverter(config.cooldowns!, k, v)));
    }

    if ('permissions' in config) {
      for (const permissionType of Object.values(PermissionType))
        if (config.permissions[permissionType]) this.permissions[permissionType].push(...config.permissions[permissionType]);
    }

    if ('contexts' in config) this.contexts = config.contexts;
    if ('disabled' in config) this.disabled = config.disabled;

    if ('noDefer' in config) this.noDefer = config.noDefer;
    if ('ephemeralDefer' in config) this.ephemeralDefer = config.ephemeralDefer;

    if ('options' in config) {
      this.options = (config.options as unknown as (CommandOption<NoInfer<CT>, NoInfer<CTX>> | CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>>)[])
        .map(opt => (opt instanceof CommandOption ? opt : new CommandOptionUninitialized<NoInfer<CT>, NoInfer<CTX>>(opt)));
    }

    if (config.beta) this.beta = config.beta;

    this.aliases = Object.fromEntries(config.types.map((e: NoInfer<CT>[number]) => [e, config.aliases?.[e] ?? []]));

    this.types = config.types;
    this.disabledReason = config.disabledReason;
  }

  init(...args: ConstructorParameters<typeof Command<CT, CTX, Options>> extends [unknown, ...infer R] ? R : never): Command<CT, CTX, Options> {
    return new Command<CT, CTX, Options>(this, ...args);
  }
}