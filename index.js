/* eslint-disable max-lines */

/**
 * @import { Locale, Translator } from '@mephisto5558/i18n'
 * @import { Command as CommandT, CommandOption as CommandOptionT, CommandType, CommandConfig, CommandOptionConfig, CommandExecutionError as CommandExecutionErrorT, customPermissionChecksFn } from '.' */ /* eslint-disable-line @stylistic/max-len */


const
  {
    ApplicationCommandOptionType, ApplicationCommandType, ChannelType,
    Colors, CommandInteraction, EmbedBuilder, Message, MessageFlags, PermissionsBitField, inlineCode
  } = require('discord.js'),
  { basename, dirname } = require('node:path'),
  {
    filename, loadFile, capitalize,
    constants: { autocompleteOptionsMaxAmt, descriptionMaxLength, choicesMaxAmt, choiceValueMaxLength, choiceValueMinLength }, cooldowns
  } = require('./utils');

/**
 * @param {unknown} a
 * @param {unknown} b */
function equal(a, b) {
  if (a === b) return true;

  if (!a?.toString() && !b?.toString()) return true;
  if (typeof a == 'string' || typeof b == 'string') return a == b;
  if (a == undefined && !b?.__count__ || b == undefined && !a?.__count__) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const
    keysA = Object.keys(a),
    keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;
  for (const key of keysA)
    if (!equal(a[key], b[key])) return false;

  return true;
}

const commandTypes = Object.freeze({
  slash: 'slash',
  prefix: 'prefix'
});


class CommandExecutionError extends Error {
  name = 'CommandExecutionError';

  /**
   * @param {string | undefined} message
   * @param {CommandExecutionErrorT['interaction']} interaction
   * @param {CommandExecutionErrorT['translator']} translator
   * @param {ErrorOptions | undefined} options */
  constructor(message, interaction, translator, options) {
    super(message, options);

    this.interaction = interaction;
    this.translator = translator;
  }
}

class CommandOption {
  name;

  /** @type {string} */ description;
  /** @type {CommandOptionT['descriptionLocalizations']} */ descriptionLocalizations = {};

  type;
  required = false;
  cooldowns = { guild: 0, channel: 0, user: 0 };
  dmPermission = false;
  get autocomplete() { return !!this.autocompleteOptions; }

  strictAutocomplete = false;
  autocompleteOptions;
  choices;
  channelTypes;
  /** @type {CommandOptionT['options']} */ options = [];

  /** @type {Parameters<CommandOptionT['init']>['0']} */ #i18n;
  /** @type {Parameters<CommandOptionT['init']>['2']} */ #logger;

  /** @param {CommandOptionConfig<CommandType[], boolean>} config */
  constructor(config = {}) {
    if (config.required != undefined) this.required = config.required;
    if (config.cooldowns) {
      if (config.cooldowns.guild) this.cooldowns.guild = config.cooldowns.guild;
      if (config.cooldowns.channel) this.cooldowns.channel = config.cooldowns.channel;
      if (config.cooldowns.user) this.cooldowns.user = config.cooldowns.user;
    }
    if (config.dmPermission) this.dmPermission = config.dmPermission;
    if (config.choices) this.choices = config.choices.map(e => ({ value: e }));
    if (config.strictAutocomplete) this.strictAutocomplete = config.strictAutocomplete;
    if (config.options) this.options = config.options.map(e => (e instanceof CommandOption ? e : new CommandOption(e)));

    this.name = config.name;
    this.type = ApplicationCommandOptionType[config.type]; // todo: make the user use that

    this.autocompleteOptions = config.autocompleteOptions;

    this.channelTypes = config.channelTypes;

    this.minValue = config.minValue;
    this.maxValue = config.maxValue;

    this.minLength = config.minLength;
    this.maxLength = config.maxLength;
  }

  /** @type {CommandOptionT['init']} */
  init(i18n, parentId, logger = console, position = 0) {
    this.#i18n = i18n;
    this.#logger = logger;

    this.id = `${parentId}.options.${this.name}`;
    this.position = position;

    this.#validate();
    this.#localize();

    for (const [i, option] of this.options.entries()) option.init(i18n, this.id, logger, i);

    return this;
  }

  #validate() {
    if (/[A-Z]/.test(this.name)) {
      if (!this.disabled)
        this.#logger.error(`"${this.name}" (${this.id}.name) has uppercase letters! Fixing.`);

      this.name = this.name.toLowerCase();
    }

    if (
      [ApplicationCommandOptionType.Number, ApplicationCommandOptionType.Integer].includes(this.type)
      && ('minLength' in this || 'maxLength' in this)
    ) throw new Error(`Number and Integer options do not support "minLength" and "maxLength" (${this.id})`);

    if (this.type == ApplicationCommandOptionType.String && ('minValue' in this || 'maxValue' in this))
      throw new Error(`String options do not support "minValue" and "maxValue" (${this.id})`);
  }

  #localize() {
    for (const [locale] of this.#i18n.availableLocales) {
      const
        requiredTranslator = this.#i18n.getTranslator({ locale, errorNotFound: true, backupPaths: [this.id] }),
        optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });

      ; /* eslint-disable-line @stylistic/no-extra-semi -- formatting reasons */

      // description
      const localizedDescription = locale == this.#i18n.config.defaultLocale ? optionalTranslator('description') : requiredTranslator('description');
      if (localizedDescription?.length > descriptionMaxLength && !this.disabled)
        this.#logger.warn(`"${locale}" description for command "${this.name}" (${this.id}.description) is too long (max length is 100)! Slicing.`);

      if (locale == this.#i18n.config.defaultLocale) this.description = localizedDescription.slice(0, descriptionMaxLength);
      else if (localizedDescription) this.descriptionLocalizations[locale] = localizedDescription.slice(0, descriptionMaxLength);
      else if (!this.disabled) this.#logger.warn(`Missing "${locale}" description for command "${this.name}" (${this.id}.description)`);


      // choices
      if ('choices' in this) this.#localizeChoices(locale);
    }
  }

  /**
   * @param {Locale} locale
   * @throws {Error} on too many choices */
  #localizeChoices(locale) {
    if (this.choices.length > choicesMaxAmt) {
      throw new Error(
        `Too many choices (${this.choices.length}) found for option "${this.name}"). Max is ${choicesMaxAmt}.`
        + 'Use autocompleteOptions with strictAutocomplete instead.'
      );
    }

    const optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });


    /** @type {NonNullable<CommandOptionT['choices']>[number]} */
    let choice;
    for (choice of this.choices) {
      choice.nameLocalizations ??= {};

      const localizedChoice = optionalTranslator(`choices.${choice.value}`) ?? choice.value.toString();
      if (localizedChoice) {
        const errMsg = `"${locale}" choice name localization for "${choice.value}" of option "${this.name}"`
          + `(${this.id}.choices.${choice.value}) is too`;

        if (localizedChoice.length < choiceValueMinLength) {
          this.#logger.warn(`${errMsg} short (min length is ${choiceValueMinLength})! Skipping this localization.`);
          continue;
        }
        else if (localizedChoice.length > choiceValueMaxLength)
          this.#logger.warn(`${errMsg} long (max length is ${choiceValueMaxLength})! Slicing.`);

        if (locale == this.#i18n.config.defaultLocale) choice.name = localizedChoice;
        else choice.nameLocalizations[locale] = localizedChoice;
      }
      else if (choice.name != choice.value && !this.disabled) {
        this.#logger.warn(
          `Missing "${locale}" choice name localization for "${choice.value}" in option "${this.name}" (${this.id}.choices.${choice.value})`
        );
      }
    }
  }

  /** @type {CommandOptionT<CommandType[], boolean>['isRunnable']} */
  async isRunnable(interaction, command, wrapperTranslator, args) {
    if (
      [ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(this.type)
      && !this.dmPermission && interaction.channel.type == ChannelType.DM
    ) return ['guildOnly'];

    if (this.type == ApplicationCommandOptionType.SubcommandGroup) {
      const
        subcommandName = interaction instanceof CommandInteraction ? interaction.options.getSubcommand(true) : args[0],
        subcommand = this.options.find(e => e.name == subcommandName);

      // subcommand should always exist, `false` is a fallback
      return subcommand?.isRunnable(
        interaction, command, wrapperTranslator,
        interaction instanceof Message ? args.slice(1) : args
      ) ?? false;
    }

    if (this.type == ApplicationCommandOptionType.Subcommand) {
      for (const option of this.options) {
        const err = await option.isRunnable(interaction, command, wrapperTranslator, args);
        if (err) return err;
      }

      return false;
    }

    const
      option = interaction instanceof Message ? undefined : interaction.options.get(this.name)?.value,
      arg = args?.[this.position];

    if (this.required && option === undefined && !arg) {
      return ['paramRequired', {
        option: this.name,
        description: (wrapperTranslator.config.locale ? this.descriptionLocalizations[wrapperTranslator.config.locale] : undefined)
          ?? this.descriptionLocalizations[wrapperTranslator.defaultConfig.defaultLocale] ?? this.description
      }];
    }

    const channel = interaction instanceof Message ? interaction.guild.channels.cache.get(arg) : interaction.options.getChannel(this.name);

    if (this.type == ApplicationCommandOptionType.Channel && this.channelTypes && channel && !this.channelTypes.includes(channel.type))
      return ['invalidChannelType', this.name];

    if (
      interaction instanceof Message && this.autocomplete && this.strictAutocomplete && arg
      && (await this.generateAutocomplete(interaction, arg, wrapperTranslator.config.locale ?? wrapperTranslator.defaultConfig.defaultLocale))
        .some(e => e.value.toString().toLowerCase() === arg.toLowerCase())
    ) {
      if (typeof this.autocompleteOptions == 'function') return ['strictAutocompleteNoMatch', this.name];

      return ['strictAutocompleteNoMatchWValues', {
        option: this.name,
        availableOptions: Array.isArray(this.autocompleteOptions)
          ? this.autocompleteOptions.map(e => (typeof e == 'object' ? e.value : e)).map(inlineCode).join(', ')
          : this.autocompleteOptions
      }];
    }


    if (interaction instanceof Message && arg && this.choices && !this.choices.some(e => e.value == arg))
      return ['strictAutocompleteNoMatchWValues', { option: this.name, availableOptions: this.choices.map(e => inlineCode(e.value)).join(', ') }];

    return false;
  }

  /** @type {CommandOptionT['generateAutocomplete']} */
  async generateAutocomplete(interaction, query, locale, translator, options = this.autocompleteOptions) {
    if (options == undefined) return [];

    translator ??= this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [`${this.id}.choices`] });

    if (typeof options == 'function') options = await options.call(interaction, query);
    if (typeof options == 'string' || typeof options == 'number') return [{ name: translator(options) ?? options, value: options }];

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

  /* eslint-disable sonarjs/expression-complexity, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-type-conversion,
  @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, custom/cyclomatic-complexity -- TODO: refactor */

  /** @type {CommandOptionT<CommandType[]>['isEqualTo']} */
  isEqualTo(opt) {
    if (
      this.name != opt?.name || this.description != opt.description || this.type != opt.type
      || this.autocomplete != opt.autocomplete || !!this.required != !!opt.required
      || this.minValue != opt.minValue || this.maxValue != opt.maxValue
      || this.minLength != opt.minLength || this.maxLength != opt.maxLength
      || !equal(this.nameLocalizations, opt.nameLocalizations)
      || !equal(this.descriptionLocalizations, opt.descriptionLocalizations)
      || !this.#choicesEqualTo(opt.choices) || !this.#channelTypesEqualTo(opt.channelTypes)
    ) return false;

    if ((this.options.length ?? 0) != (opt.options.length ?? 0)) return false;
    if (this.options.length) {
      for (const option of this.options) {
        const other = opt.options.find(e => e.name == option.name);
        if (!other || !option.isEqualTo(other)) return false;
      }
    }
    return true;
  }

  /** @param {CommandOptionT['choices']} choices */
  #choicesEqualTo(choices) {
    if ((this.choices?.length ?? 0) != (choices?.length ?? 0)) return false;
    if (this.choices?.length) {
      for (const choice of this.choices) {
        const other = choices.find(e => e.name == choice.name);
        if (!other || !equal(choice, other)) return false;
      }
    }
    return true;
  }

  /** @param {CommandOptionT['channelTypes']} channelTypes */
  #channelTypesEqualTo(channelTypes) {
    if ((this.channelTypes?.length ?? 0) != (channelTypes?.length ?? 0)) return false;
    if (this.channelTypes?.length) {
      for (const type of this.channelTypes)
        if (!channelTypes.includes(type)) return false;
    }
    return true;
  }

  /* eslint-enable sonarjs/expression-complexity, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-type-conversion,
  @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment,
  @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, custom/cyclomatic-complexity */
}

class Command {
  /** @type {string} */ name;
  nameLocalizations = {};

  /** @type {CommandT<CommandType[]>['commandId'] | CommandT<['prefix']>['commandId']} */
  commandId;

  /** @type {string} */ description;
  descriptionLocalizations = {};

  /** @type {string} */ id;
  /** @type {CommandT<CommandType[], boolean>['types']} */ types = [];
  type = ApplicationCommandType.ChatInput;

  /** @type {CommandT['usage']} */ usage = { usage: undefined, examples: undefined };
  usageLocalizations = {};

  aliases = { slash: [], prefix: [] };
  cooldowns = { guild: 0, channel: 0, user: 0 };

  permissions = { client: [], user: [] };
  get defaultMemberPermissions() {
    return new PermissionsBitField(this.permissions.user);
  }

  dmPermission = false;

  disabled = false;
  disabledReason;

  noDefer = false;
  ephemeralDefer = false;

  config = {
    devIds: new Set(), devOnlyCategories: new Set(),
    runBetaCommandsOnly: false,
    replyOn: { disabled: true, nonBeta: true }
  };

  /** @type {CommandOptionT[]} */ options = [];

  /** @type {string} */ #filePath;

  /** @type {Parameters<CommandT<CommandType[], boolean>['init']>[0]} */ #i18n;
  /** @type {NonNullable<Parameters<CommandT<CommandType[], boolean>['init']>['2']>['logger']} */ #logger;
  /** @type {NonNullable<Parameters<CommandT<CommandType[], boolean>['init']>['2']>['doneFn']} */ #doneFn;
  /** @type {customPermissionChecksFn | undefined} */ #customPermissionChecks;


  /** @param {CommandConfig<CommandType[], boolean>} config */
  constructor(config) {
    if (config.usage) {
      if (config.usage.usage) this.usage.usage = config.usage.usage;
      if (config.usage.examples) this.usage.examples = config.usage.examples;
    }

    if (config.aliases) {
      for (const commandType of Object.values(commandTypes))
        if (config.aliases[commandType]?.length) this.aliases[commandType] = config.aliases[commandType];
    }

    if (config.cooldowns) {
      if (config.cooldowns.guild) this.cooldowns.guild = config.cooldowns.guild;
      if (config.cooldowns.channel) this.cooldowns.channel = config.cooldowns.channel;
      if (config.cooldowns.user) this.cooldowns.user = config.cooldowns.user;
    }

    if (config.permissions) {
      if (config.permissions.client) this.permissions.client = config.permissions.client;
      if (config.permissions.user) this.permissions.user = config.permissions.user;
    }

    if (config.dmPermission) this.dmPermission = config.dmPermission;
    if (config.disabled) this.disabled = config.disabled;

    if (config.noDefer) this.noDefer = config.noDefer;
    if (config.ephemeralDefer) this.ephemeralDefer = config.ephemeralDefer;

    if (config.options) this.options = config.options.map(e => (e instanceof CommandOption ? e : new CommandOption(e)));
    if (config.beta) this.beta = config.beta;

    this.types = config.types;
    this.disabledReason = config.disabledReason;

    this.run = config.run;
  }

  /** @type {CommandT<CommandType[], boolean>['init']} */
  init(i18n, filePath, {
    logger = console, doneFn, devIds, devOnlyCategories, runBetaCommandsOnly, replyOn = {},
    customPermissionChecks
  } = {}) {
    this.#filePath = filePath;

    this.#i18n = i18n;
    this.#logger = logger;
    this.#doneFn = doneFn;
    this.#customPermissionChecks = customPermissionChecks?.bind(this);

    if (devIds) this.config.devIds = devIds;
    if (devOnlyCategories) this.config.devOnlyCategories = devOnlyCategories;
    this.config.runBetaCommandsOnly = !!runBetaCommandsOnly;

    this.config.replyOn.disabled = !!replyOn.disabled;
    this.config.replyOn.nonBeta = !!replyOn.nonBeta;

    this.name = filename(this.#filePath).toLowerCase();
    this.category = basename(dirname(this.#filePath)).toLowerCase();
    this.id = `commands.${this.category}.${this.name}`;

    this.#validate();
    this.#localize();

    for (const option of this.options) option.init(this.#i18n, this.id, this.#logger, 0);
    for (const [i, option] of this.options.entries()) option.init(this.#i18n, this.id, this.#logger, i);

    return this;
  }

  #validate() {
    if (!this.disabled && !['function', 'async function', 'async run(', 'run('].some(e => String(this.run).startsWith(e)))
      throw new TypeError(`The "run" method of command "${this.id}" is an arrow function! You cannot use arrow functions!`);
  }

  #localize() {
    for (const [locale] of this.#i18n.availableLocales) {
      const
        requiredTranslator = this.#i18n.getTranslator({ locale, errorNotFound: true, backupPaths: [this.id] }),
        optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });

      ; /* eslint-disable-line @stylistic/no-extra-semi -- formatting reasons */

      // description
      const localizedDescription = locale == this.#i18n.config.defaultLocale ? optionalTranslator('description') : requiredTranslator('description');
      if (localizedDescription?.length > descriptionMaxLength && !this.disabled)
        this.#logger.warn(`"${locale}" description for command "${this.name}" (${this.id}.description) is too long (max length is 100)! Slicing.`);

      if (locale == this.#i18n.config.defaultLocale) this.description = localizedDescription.slice(0, descriptionMaxLength);
      else if (localizedDescription) this.descriptionLocalizations[locale] = localizedDescription.slice(0, descriptionMaxLength);
      else if (!this.disabled) this.#logger.warn(`Missing "${locale}" description for command "${this.name}" (${this.id}.description)`);


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

  /** @type {CommandT<CommandType[], boolean>['runWrapper']} */
  async runWrapper(interaction, i18n, locale) {
    const
      wrapperTranslator = i18n.getTranslator({ locale, backupPaths: ['events.command'] }),
      commandTranslator = i18n.getTranslator({ locale, backupPaths: [this.id] }),
      commandType = interaction instanceof CommandInteraction ? commandTypes.slash : commandTypes.prefix,

      errorKey = await this.#isRunnable(interaction, wrapperTranslator);

    if (errorKey !== false) {
      if (errorKey === true) return; // already handled by the function
      return interaction.reply({
        embeds: [new EmbedBuilder({ description: wrapperTranslator(...errorKey), color: Colors.Red })],
        flags: MessageFlags.Ephemeral
      });
    }

    interaction.commandName ??= this.name; // Is undefined on `MessageComponentInteraction`s

    this.#logger.debug(`Executing ${commandType} command ${this.name}`);

    if (commandType == commandTypes.slash && interaction instanceof CommandInteraction && !this.noDefer && !this.replied)
      await interaction.deferReply({ flags: this.ephemeralDefer ? MessageFlags.Ephemeral : undefined });

    try {
      await this.run.call(interaction, commandTranslator, interaction.client);
      await this.#doneFn.call(interaction, this, commandTranslator);
    }
    catch (err) { throw new CommandExecutionError(err.message, interaction, wrapperTranslator, { cause: err }); }
  }

  /**
   * @param {Parameters<customPermissionChecksFn>[0]} interaction
   * @param {Translator} wrapperTranslator
   * @returns {ReturnType<customPermissionChecksFn>} */
  async #isRunnable(interaction, wrapperTranslator) {
    const
      author = interaction instanceof Message ? interaction.author : interaction.user,
      args = interaction instanceof Message ? interaction.content.split(/\s+/).slice(1) : undefined;

    if (this.config.devOnlyCategories.has(this.category) && !this.config.devIds.has(author.id)) return true;

    if (this.config.runBetaCommandsOnly && !this.beta) return this.config.replyOn.nonBeta ? ['nonBeta'] : true;
    if (this.disabled) return this.config.replyOn.disabled ? ['disabled', this.disabledReason ?? 'Not provided'] : true;

    if (interaction instanceof Message) {
      if (!this.types.includes(commandTypes.prefix)) return ['slashOnly', this.mention];
      if (interaction.guild?.members.me.communicationDisabledUntil) return true;
    }

    if (!this.dmPermission && interaction.channel.type == ChannelType.DM) return ['guildOnly'];
    if (this.category == 'nsfw' && !interaction.channel?.nsfw) return ['nsfw'];

    if (this.#customPermissionChecks) {
      const customErr = await this.#customPermissionChecks(interaction, author, wrapperTranslator);
      if (customErr) return customErr;
    }

    let activeOption;
    if (interaction instanceof CommandInteraction) {
      const group = interaction.options.getSubcommandGroup(false);
      if (group) activeOption = this.options.find(e => e.name == group);
      else {
        const subcommand = interaction.options.getSubcommand(false);
        if (subcommand) activeOption = this.options.find(e => e.name == subcommand);
      }
    }
    else if (interaction instanceof Message) {
      activeOption = this.options.find(e => e.name == args[0]
        && [ApplicationCommandOptionType.Subcommand, ApplicationCommandOptionType.SubcommandGroup].includes(e.type)) ?? activeOption;
    }

    for (const option of activeOption ? [activeOption] : this.options) {
      const err = await option.isRunnable(interaction, this, wrapperTranslator, args?.slice(activeOption && interaction instanceof Message ? 1 : 0));
      if (err) return err;
    }

    if (!this.config.runBetaCommandsOnly) {
      const cooldown = cooldowns.call(interaction, this.name, this.cooldowns);
      if (cooldown) return ['cooldown', inlineCode(cooldown)];
    }

    return interaction.inGuild() && await checkPerms.call(interaction, this, wrapperTranslator);
  }

  /**
   * @param {string} action
   * @param {string | undefined} name
   * @param {string | undefined} alias */
  #logLoadMsg(action, name = this.name, alias = this.name) {
    return this.#logger.log(`${action} ${capitalize(commandTypes.slash)} Command ${name}${alias == name ? '' : ' (Alias of ' + alias + ')'}`);
  }

  /** @type {CommandT<CommandType[]>['reload']} */
  async reload(application, i18n = this.#i18n) {
    /** @type {CommandT | { default: CommandT }} */
    let newCommand = await loadFile(this.#filePath);
    newCommand = 'default' in newCommand ? newCommand.default : newCommand;

    await i18n.loadAllLocales();
    newCommand.init(i18n, this.#filePath, this.#logger);

    if ([this, newCommand].some(e => e.types.includes(commandTypes.slash))) {
      const appCommand = await this.reloadApplicationCommand(application, newCommand);
      newCommand.commandId = appCommand?.id;
    }

    return newCommand;
  }

  /** @type {CommandT<CommandType[]>['reloadApplicationCommand']} */
  async reloadApplicationCommand(application, newCommand) {
    const
      existingCommands = await application.commands.fetch(),
      isEqual = this.isEqualTo(newCommand);

    let appCommand;

    if (this.types.includes(commandTypes.slash) && !newCommand.types.includes(commandTypes.slash)) {
      if (this.commandId) await application.commands.delete(this.commandId);
      this.#logLoadMsg('Deleted');
    }
    else if (newCommand.types.includes(commandTypes.slash)) {
      if (newCommand.disabled) {
        if (this.commandId) {
          await application.commands.delete(this.commandId);
          this.#logLoadMsg('Deleted Disabled');
        }
      }
      else if (isEqual && this.commandId && existingCommands.has(this.commandId))
        appCommand = existingCommands.get(this.commandId);
      else {
        const existing = existingCommands.find(e => e.name == newCommand.name);
        if (existing) {
          appCommand = await application.commands.edit(existing.id, newCommand);
          this.#logLoadMsg('Reloaded');
        }
        else {
          appCommand = await application.commands.create(newCommand);
          this.#logLoadMsg('Created');
        }
      }
    }

    for (const alias of new Set([...this.aliases[commandTypes.slash], ...newCommand.aliases[commandTypes.slash]])) {
      const
        inOld = this.aliases[commandTypes.slash].includes(alias),
        inNew = newCommand.aliases[commandTypes.slash].includes(alias),
        existing = existingCommands.find(e => e.name == alias);

      if (inOld && !inNew) {
        if (existing) {
          await application.commands.delete(existing.id);
          this.#logLoadMsg('Deleted', alias);
        }
      }
      else if (inNew) {
        if (newCommand.disabled) {
          if (existing) {
            await application.commands.delete(existing.id);
            this.#logLoadMsg('Deleted Disabled', alias);
          }
          continue;
        }

        if (isEqual && inOld && existing) continue;

        // clone class instance to change it's name
        const commandClone = Object.assign(Object.create(Object.getPrototypeOf(newCommand)), newCommand);
        commandClone.name = alias;

        if (existing) {
          await application.commands.edit(existing.id, commandClone);
          this.#logLoadMsg('Reloaded', alias);
        }
        else {
          await application.commands.create(commandClone);
          this.#logLoadMsg('Created', alias);
        }
      }
    }

    return appCommand;
  }

  /** @type {CommandT['findOption']} */
  findOption({ name, type }, interaction) {
    const
      group = interaction?.options.getSubcommandGroup(false),
      subcommand = interaction?.options.getSubcommand(false);

    /* eslint-disable-next-line @typescript-eslint/no-this-alias -- this is required and fine in this context. */
    let { options } = this;
    if (group) ({ options } = options.find(e => e.name == group));
    if (subcommand) ({ options } = options.find(e => e.name == subcommand));

    return options.find(e => e.name == name && (!type || e.type == type));
  }

  /** @type {CommandT['isEqualTo']} */
  isEqualTo(cmd) {
    if (!cmd) return false;
    if (
      /* eslint-disable-next-line sonarjs/expression-complexity */
      this.name != cmd.name || this.description != cmd.description || this.type != cmd.type
      /* eslint-disable-next-line @typescript-eslint/no-deprecated */
      || this.dmPermission != cmd.dmPermission
      || this.defaultMemberPermissions.bitfield != cmd.defaultMemberPermissions?.bitfield
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
}

module.exports = {
  Command,
  CommandOption,
  commandTypes,
  CommandExecutionError,
  ...require('./utils'),
  loaders: require('./loaders')
};