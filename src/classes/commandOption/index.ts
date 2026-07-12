import * as Discord from 'discord.js';
import { ContextType, CooldownType, isSnowflake } from '../../index.ts';
import { autocompleteOptionsMaxAmt, choiceValueMaxLength, choiceValueMinLength, choicesMaxAmt, descriptionMaxLength } from '../../utils/constants.ts';
import { CommandValidationError, cooldownConverter, equal, isMessage } from '../utils.ts';
import { DefaultContext } from './utils.ts';

import type { I18nProvider, Locale, Translator } from '@mephisto5558/i18n';
import type {
  AllContexts, ChatInputCommandInteraction, CommandInitialized as Command, CommandInteraction,
  Logger, Message, MessageComponentInteraction
} from '../../index.ts';
import type { CooldownsManager } from '../../utils/CooldownsManager.ts';
import type { RunnableReturns } from '../command/utils.ts';
import type { CommandType } from '../utils.ts';
import type {
  AutocompleteGeneratorOptions, CommandOptionConfig, FallbackChannels,
  MapChannelTypes, PublicAutocompleteGeneratorOptions, autocompleteObject
} from './utils.ts';

export class CommandOption<
  const CT extends readonly CommandType[] = readonly [],
  const CTX extends AllContexts = DefaultContext,
  AO = undefined,
  const ChildrenOptions extends readonly CommandOptionConfig<CT, CTX>[] = readonly CommandOptionConfig<CT, CTX>[],
  T extends Discord.ApplicationCommandOptionType = Discord.ApplicationCommandOptionType
> {
  name: Lowercase<string>;
  id: `${string}.options.${CommandOption['name']}`;
  position = 0;

  /** Currently not used */
  nameLocalizations?: Partial<Record<Locale, CommandOption['name']>>;
  description!: string;
  descriptionLocalizations: Partial<Record<Locale, string>> = {};

  type: T;

  required: boolean;

  cooldowns: Record<CooldownType, number>;

  contexts: CTX;

  disabled!: boolean;

  /** Always present if `disabled` is `true` */
  disabledReason: string | undefined;

  get autocomplete(): boolean { return !!this.autocompleteOptions; }
  /* eslint-disable-next-line unicorn/consistent-class-member-order -- same context */
  strictAutocomplete: boolean;
  autocompleteOptions?: NonNullable<GetAll<Extract<
    CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>>, { type: T }
  >, 'autocompleteOptions'>['autocompleteOptions']> | undefined;

  choices?: IfExtends<T, GetAll<Discord.ApplicationCommandOption, 'choices'>['type'],
    { ifTrue: readonly Discord.ApplicationCommandOptionChoiceData[] }
  > | undefined;

  channelTypes?: NonNullable<GetAll<Extract<
    CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>>, { type: T }
  >, 'channelTypes'>['channelTypes']> | undefined;

  minValue?: NonNullable<GetAll<Extract<
    CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>>, { type: T }
  >, 'minValue'>['minValue']> | undefined;

  maxValue?: NonNullable<GetAll<Extract<
    CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>>, { type: T }
  >, 'maxValue'>['maxValue']> | undefined;

  minLength?: NonNullable<GetAll<Extract<
    CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>>, { type: T }
  >, 'minLength'>['minLength']> | undefined;

  maxLength?: NonNullable<GetAll<Extract<
    CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>>, { type: T }
  >, 'maxLength'>['maxLength']> | undefined;

  options?: IfExtends<T, GetAll<Discord.ApplicationCommandOption, 'options'>['type'],
    { ifTrue: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>>[] }
  > | undefined;

  run?: (
    this: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Component, MessageComponentInteraction<NoInfer<CTX>>],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    lang: Translator<false, Locale>, options: NoInfer<AO>,
    data: {
      client: Discord.Client<true>;
      command: Command<NoInfer<CT>, NoInfer<CTX>>;
      option: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>;
    }
  ) => unknown;

  readonly #i18n: I18nProvider;
  readonly #cooldownsManager: CooldownsManager;
  readonly #logger: Logger;
  readonly #messagePrefixesArePreRemoved: boolean;

  /**
   * {@link Command.init Commands} and not the user should initialize `CommandOption`s.
   * @internal */
  constructor(
    base: CommandOptionUninitialized<CT, CTX, AO, ChildrenOptions, T>,
    i18n: I18nProvider, parentId: Command['id'] | CommandOption['id'],
    config: {
      cooldownsManager: CooldownsManager;
      logger?: Logger;
      position?: number;
      messagePrefixesArePreRemoved?: boolean;
    }
  ) {
    this.type = base.type;
    this.name = base.name;
    this.required = base.required;
    this.contexts = base.contexts;
    if (base.run) this.run = base.run;
    this.minLength = base.minLength;
    this.maxLength = base.maxLength;
    this.minValue = base.minValue;
    this.maxValue = base.maxValue;
    this.choices = base.choices;
    this.autocompleteOptions = base.autocompleteOptions;
    this.strictAutocomplete = base.strictAutocomplete;
    this.channelTypes = base.channelTypes;
    this.cooldowns = base.cooldowns;
    this.#messagePrefixesArePreRemoved = !!config.messagePrefixesArePreRemoved;

    this.#i18n = i18n;
    this.#logger = config.logger ?? console;
    this.#cooldownsManager = config.cooldownsManager;

    this.id = `${parentId}.options.${this.name}`;
    this.position = config.position ?? 0;

    if (base.options) {
      this.options = base.options.map((e, i) => e.init(i18n, this.id, {
        cooldownsManager: this.#cooldownsManager,
        logger: this.#logger,
        position: i,
        messagePrefixesArePreRemoved: this.#messagePrefixesArePreRemoved
      })) as typeof this.options;
    }

    this.#validate();
    this.#localize();
  }

  getChannel<This, RetSelf extends boolean = false>(
    this: This, // important for return type resolving
    interaction: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>, returnSelf: RetSelf
  ): (
  [Discord.ChannelType[]] extends [This extends { channelTypes: infer CHT } ? CHT : never]
    ? FallbackChannels<NoInfer<CT>, NoInfer<CTX>>
    : This extends { channelTypes: infer CHT extends readonly Discord.ChannelType[] }
      ? MapChannelTypes<CHT>
      : FallbackChannels<NoInfer<CT>, NoInfer<CTX>>
  ) | IfD<RetSelf,
    This extends { run?: unknown }
      ? ThisParameterType<NonNullable<This['run']>> extends { channel: infer C } ? C : undefined
      : undefined,
    undefined
  >;

  getChannel(
    interaction: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    returnSelf = false
  ): unknown {
    if (this.type != Discord.ApplicationCommandOptionType.Channel)
      throw new Error(`This method does not run on ${Discord.ApplicationCommandOptionType[this.type]} options!`);

    let target = isMessage(interaction)
      ? interaction.mentions.channels.first()
      : (interaction as ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>).options.getChannel(this.name, false, this.channelTypes);

    if (!target && isMessage(interaction))
      target = interaction.guild?.channels.cache.find(e => [e.id, e.name].some(e => interaction.content.includes(e)));
    if (target) return target;

    return returnSelf ? interaction.channel : undefined;
  }

  #validate(): void {
    if (this.disabled) {
      if (this.disabledReason) return;
      throw new CommandValidationError('A disabled command requires a disabledReason!', this);
    }

    if (/[A-Z]/.test(this.name)) {
      this.#logger.error(`"${this.name}" (${this.id}.name) has uppercase letters! Fixing.`);
      this.name = this.name.toLowerCase();
    }

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

      // choices
      if (this.choices) this.#localizeChoices(locale);
    }
  }

  /** @throws {Error} on too many choices */
  #localizeChoices(locale: Locale): void {
    if (!this.choices) return;

    if (this.choices.length > choicesMaxAmt) {
      throw new Error(
        `Too many choices (${this.choices.length}) found for option "${this.name}"). Max is ${choicesMaxAmt}.`
        + 'Use autocompleteOptions with strictAutocomplete instead.'
      );
    }

    const optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });

    for (const choice of this.choices) {
      choice.nameLocalizations ??= {};

      const localizedChoice = optionalTranslator(`choices.${choice.value}`) ?? choice.value.toString();
      if (localizedChoice) {
        const errMsg = `"${locale}" choice name localization for "${choice.value}" of option "${this.name}" `
          + `(${this.id}.choices.${choice.value}) is too`;

        if (localizedChoice.length < choiceValueMinLength) {
          this.#logger.warn(`${errMsg} short (min length is ${choiceValueMinLength})! Skipping this localization.`);
          continue;
        }
        else if (localizedChoice.length > choiceValueMaxLength)
          this.#logger.warn(`${errMsg} long (max length is ${choiceValueMaxLength})! Slicing.`);

        if (locale == this.#i18n.config.defaultLocale) choice.name = localizedChoice;
        else if (locale == 'en') {
          choice.nameLocalizations[Discord.Locale.EnglishGB] = localizedChoice;
          choice.nameLocalizations[Discord.Locale.EnglishUS] = localizedChoice;
        }
        else choice.nameLocalizations[locale] = localizedChoice;
      }
      else if (choice.name != choice.value && !this.disabled) {
        this.#logger.warn(
          `Missing "${locale}" choice name localization for "${choice.value}" in option "${this.name}" (${this.id}.choices.${choice.value})`
        );
      }
    }
  }

  async isRunable(
    interaction: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    command: Command<NoInfer<CT>, NoInfer<CTX>>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<RunnableReturns | boolean> {
    if (
      [Discord.ApplicationCommandOptionType.SubcommandGroup, Discord.ApplicationCommandOptionType.Subcommand].includes(this.type)
      && !this.contexts.includes(ContextType.BotDM) && interaction.channel.type == Discord.ChannelType.DM
    ) return ['guildOnly'];

    if (this.type == Discord.ApplicationCommandOptionType.SubcommandGroup)
      return this.#isRunableSubcommandGroup(interaction, command, wrapperTranslator, args);
    if (this.type == Discord.ApplicationCommandOptionType.Subcommand)
      return this.#isRunableSubcommand(interaction, command, wrapperTranslator, args);

    const
      option = isMessage(interaction)
        ? undefined
        : (interaction as ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>).options.get(this.name)?.value,
      arg = args?.[this.position];

    if (this.required && option === undefined && !arg) {
      return ['paramRequired', {
        option: this.name,
        description: (wrapperTranslator.config.locale ? this.descriptionLocalizations[wrapperTranslator.config.locale] : undefined)
          ?? this.descriptionLocalizations[wrapperTranslator.defaultConfig.defaultLocale] ?? this.description
      }];
    }

    if (isMessage(interaction) && arg) { // if it's an interaction then these checks will be done by Discord
      if (this.type == Discord.ApplicationCommandOptionType.Channel && this.channelTypes) {
        let channel;
        if (isSnowflake(arg)) channel = interaction.guild?.channels.cache.get(arg);
        if (channel && !this.channelTypes.includes(channel.type)) return ['invalidChannelType', this.name];
      }

      if (
        this.autocomplete && this.strictAutocomplete
        && !(await this.generateAutocomplete(
          interaction as unknown as Parameters<typeof this.generateAutocomplete>[0], arg,
          wrapperTranslator.config.locale ?? wrapperTranslator.defaultConfig.defaultLocale
        )).some(e => e.value.toString().toLowerCase() === arg.toLowerCase())
      ) {
        if (typeof this.autocompleteOptions == 'function') return ['strictAutocompleteNoMatch', this.name];

        let availableOptions: string | number;
        if (!this.autocompleteOptions) availableOptions = '';
        else if (Array.isArray(this.autocompleteOptions))
          availableOptions = this.autocompleteOptions.map(e => (typeof e == 'object' ? e.value : e).toString()).map(Discord.inlineCode).join(', ');

        else if (typeof this.autocompleteOptions == 'object') availableOptions = (this.autocompleteOptions as autocompleteObject).value;
        else availableOptions = this.autocompleteOptions;

        return ['strictAutocompleteNoMatchWValues', { option: this.name, availableOptions: availableOptions.toString() }];
      }

      if (this.choices && !this.choices.some(e => e.value.toString().toLowerCase() == arg.toLowerCase())) {
        return ['strictAutocompleteNoMatchWValues', {
          option: this.name,
          availableOptions: this.choices.map(e => Discord.inlineCode(e.value.toString())).join(', ')
        }];
      }
    }

    return false;
  }

  async #isRunableSubcommandGroup(
    interaction: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    command: Command<NoInfer<CT>, NoInfer<CTX>>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<RunnableReturns | boolean> {
    const
      subcommandName = isMessage(interaction)
        ? args?.[this.position]
        : (interaction as ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>).options.getSubcommand(true),
      subcommand = this.options?.find(e => e.name == subcommandName);

    return subcommand?.isRunable(interaction, command, wrapperTranslator, isMessage(interaction) ? args?.slice(1) : args) ?? false;
  }

  async #isRunableSubcommand(
    interaction: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    command: Command<NoInfer<CT>, NoInfer<CTX>>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<RunnableReturns | boolean> {
    if (!this.options) return false;
    for (const option of this.options) {
      const err = await option.isRunable(interaction, command, wrapperTranslator, args);
      if (err) return err;
    }

    return false;
  }

  /**
   * `translator` and `options` should not be supplied by an external caller.
   * @internal */
  async generateAutocomplete(
    ...args: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>
  ): Promise<[] | autocompleteObject[]>;
  async generateAutocomplete(...args: PublicAutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>): Promise<[] | autocompleteObject[]>;
  async generateAutocomplete(
    /* eslint-disable @typescript-eslint/no-magic-numbers -- simple number order */
    interaction: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>[0],
    query: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>[1],
    locale: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>[2],
    translator?: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>[3],
    options: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>[4] = this.autocompleteOptions
    /* eslint-enable @typescript-eslint/no-magic-numbers */
  ): Promise<[] | autocompleteObject[]> {
    if (options == undefined) return [];

    translator ??= this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [`${this.id}.choices`] });

    if (typeof options == 'function') options = await options.call(interaction, query);
    if (options == undefined) return [];

    if (typeof options == 'string' || typeof options == 'number')
      return [{ name: translator(options.toString()) ?? options.toString(), value: options }];

    if (Array.isArray(options)) {
      return (await Promise.all(
        options
          .filter(e => !query || (typeof e == 'object' ? e.value : e).toString().toLowerCase().includes(query.toLowerCase()))
          .slice(0, autocompleteOptionsMaxAmt)
          .map(async e => this.generateAutocomplete(interaction, query, locale, translator, e))
      )).flat();
    }

    return [options];
  }

  /**
   * Resets it if it's `0`.
   * @returns the currect cooldown for this subcommand(group) in ms.
   * @internal */
  updateCooldowns(interaction: CommandInteraction): number {
    return this.#cooldownsManager.update(this.id, interaction, this.cooldowns);
  }

  isEqualTo(opt: CommandOption<readonly CommandType[], AllContexts> | Discord.ApplicationCommandOption): boolean {
    for (const prop of ['name', 'description', 'type', 'autocomplete', 'required', 'minValue', 'maxValue', 'minLength', 'maxLength'] as const) {
      const optProp = prop in opt ? opt[prop as keyof typeof opt] : undefined;
      if (this[prop] != (typeof this[prop] == 'boolean' ? !!optProp : optProp)) return false;
    }

    if (
      (this.options?.length ?? 0) != ('options' in opt && opt.options ? opt.options.length : 0)
      || !equal(this.nameLocalizations, opt.nameLocalizations)
      || !equal(this.descriptionLocalizations, opt.descriptionLocalizations)
      || ('choices' in opt && opt.choices && !this.#choicesEqualTo(opt.choices))
      || ('channelTypes' in opt && opt.channelTypes && !this.#channelTypesEqualTo(opt.channelTypes))
    ) return false;

    if (this.options?.length && 'options' in opt && opt.options) {
      for (const option of this.options) {
        const other = opt.options.find(e => e.name == option.name);
        if (!other || !option.isEqualTo(other)) return false;
      }
    }
    return true;
  }

  #choicesEqualTo(choices: Readonly<NonNullable<CommandOption['choices']>>): boolean {
    if ((this.choices?.length ?? 0) != choices.length) return false;
    if (this.choices?.length) {
      for (const choice of this.choices) {
        const other = choices.find(e => e.name == choice.name);
        if (!other || !equal(choice, other)) return false;
      }
    }

    return true;
  }

  #channelTypesEqualTo(channelTypes: Readonly<NonNullable<CommandOption['channelTypes']>>): boolean {
    if ((this.channelTypes?.length ?? 0) != channelTypes.length) return false;
    if (this.channelTypes?.length) {
      for (const type of this.channelTypes)
        if (!channelTypes.includes(type)) return false;
    }

    return true;
  }

  clone(): CommandOptionUninitialized<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>> {
    /* eslint-disable-next-line @typescript-eslint/no-use-before-define -- fine with classes */
    return new CommandOptionUninitialized(this);
  }

  /**
   * @throws {CommandValidationError} if the option order is not allowed
   * @internal */
  static validateOptionOrder<
    CT extends readonly CommandType[], CTX extends AllContexts, AO
  >(baseOption: CommandOption<CT, CTX, AO> | Command<CT, CTX>): void {
    if (!baseOption.options?.length) return;

    let optionalOption;
    const optionMap = new Map<CommandOption['name'], CommandOption<CommandType[], AllContexts>>();

    for (const option of baseOption.options) {
      if (!option.required) optionalOption = option;
      else if (optionalOption) {
        throw new CommandValidationError(
          `Invalid option order in command "${baseOption.id}".`
          + `Required options ("${option.id}") cannot appear after optional options (${optionalOption.id}).`,
          baseOption, option
        );
      }

      if (optionMap.has(option.name)) {
        throw new CommandValidationError(
          'A option name must be unique across all subcommands of the same command.'
          + `Found duplicate name "${option.name}": "${optionMap.get(option.name)!.id}" and "${option.id}".`,
          baseOption, option
        );
      }
      else optionMap.set(option.name, option);

      if (!option.required) optionalOption = option;
    }
  }
}

export class CommandOptionUninitialized<
  const CT extends readonly CommandType[] = readonly [],
  const CTX extends AllContexts = DefaultContext,
  AO = undefined,
  const ChildrenOptions extends readonly CommandOptionConfig<CT, CTX>[] = readonly CommandOptionConfig<CT, CTX>[],
  T extends Discord.ApplicationCommandOptionType = Discord.ApplicationCommandOptionType
> {
  type: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['type'];
  name: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['name'];
  options?: IfExtends<T, GetAll<Discord.ApplicationCommandOption, 'options'>['type'],
    { ifTrue: CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>>[] }
  > | undefined;

  required: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['required'] = false;
  contexts: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['contexts'] = DefaultContext as unknown as CTX;
  run: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['run'];
  minLength: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['minLength'];
  maxLength: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['maxLength'];
  minValue: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['minValue'];
  maxValue: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['maxValue'];
  choices: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['choices'];
  autocompleteOptions: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['autocompleteOptions'];
  strictAutocomplete: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['strictAutocomplete'] = false;
  channelTypes: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['channelTypes'];
  cooldowns: CommandOption<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>['cooldowns'] = Object.fromEntries(Object.values(CooldownType).map(e => [e, 0]));

  /** @internal */
  constructor(config: CommandOption<CT, CTX, AO, ChildrenOptions, T>);
  /* eslint-disable-next-line @typescript-eslint/unified-signatures -- TS disagrees */
  constructor(config: ShallowPrettify<Extract<CommandOptionConfig<CT, CTX, AO, ChildrenOptions>, { type: T }>>);
  constructor(config: ShallowPrettify<Extract<CommandOptionConfig<CT, CTX, AO, ChildrenOptions>, { type: T }>> | CommandOption<CT, CTX, AO, ChildrenOptions, T>) {
    // need to set these specifically for typing
    this.type = config.type;
    this.name = config.name;

    if (config instanceof CommandOption) {
      for (const key of Object.getOwnPropertyNames(config) as (keyof typeof this)[]) {
        const descriptor = Object.getOwnPropertyDescriptor(config, key)
          ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(config) as object, key);

        if (!descriptor || descriptor.get || descriptor.writable === false) continue;

        const value = config[key as keyof typeof config];

        if (key == 'options')
          this.options = (value as NonNullable<typeof config.options>).map(opt => opt.clone()) as unknown as typeof this.options;
        else if (value && typeof value == 'object' && typeof value != 'function')
          (this as Record<typeof key, unknown>)[key] = Array.isArray(value) ? [...value] : { ...value as Record<string | number | symbol, unknown> };
        else (this as Record<typeof key, unknown>)[key] = value;
      }

      return;
    }

    if ('required' in config) this.required = config.required;

    switch (config.type) {
      case Discord.ApplicationCommandOptionType.SubcommandGroup:
      case Discord.ApplicationCommandOptionType.Subcommand:
        if ('cooldowns' in config)
          Object.fromEntries(Object.entries(this.cooldowns).map(e => cooldownConverter(config.cooldowns!, ...e)));

        if ('contexts' in config) this.contexts = config.contexts as typeof this.contexts;
        if ('options' in config) {
          this.options = ((config.options ?? []) as (
            CommandOptionUninitialized<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>> | CommandOptionConfig<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>>
          )[]).map(opt => (
            opt instanceof CommandOptionUninitialized ? opt : new CommandOptionUninitialized<NoInfer<CT>, NoInfer<CTX>, NoInfer<AO>>(opt)
          )) as typeof this.options;
        }

        if ('run' in config) this.run = config.run as unknown as NonNullable<typeof this.run>;
        break;

      case Discord.ApplicationCommandOptionType.String:
        if ('minLength' in config) this.minLength = config.minLength;
        if ('maxLength' in config) this.maxLength = config.maxLength;

        // fall through for choices and autocompleteOptions
      case Discord.ApplicationCommandOptionType.Integer:
      case Discord.ApplicationCommandOptionType.Number:
        if (config.type != Discord.ApplicationCommandOptionType.String) {
          if ('minValue' in config) this.minValue = config.minValue;
          if ('maxValue' in config) this.maxValue = config.maxValue;
        }

        if ('choices' in config)
          this.choices = config.choices.map(e => ({ name: String(e), value: e })) as unknown as NonNullable<typeof this.choices>;

        if ('autocompleteOptions' in config) this.autocompleteOptions = config.autocompleteOptions;
        if ('strictAutocomplete' in config) this.strictAutocomplete = config.strictAutocomplete;
        break;

      case Discord.ApplicationCommandOptionType.Channel:
        if ('channelTypes' in config) this.channelTypes = config.channelTypes;
        break;

      default: // no special handling
    }
  }

  init(
    ...args: ConstructorParameters<typeof CommandOption<CT, CTX, AO, ChildrenOptions, T>> extends [unknown, ...infer R] ? R : never
  ): CommandOption<CT, CTX, AO, ChildrenOptions, T> {
    return new CommandOption<CT, CTX, AO, ChildrenOptions, T>(this, ...args);
  }
}