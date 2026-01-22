/* eslint-disable max-lines */

/**
 * @import { I18nProvider } from '@mephisto5558/i18n'
 * @import { Command as CommandT, CommandOption as CommandOptionT, CommandType, CommandConfig, CommandOptionConfig } from '.' */


const
  { ApplicationCommandOptionType, ApplicationCommandType, PermissionsBitField } = require('discord.js'),
  { basename, dirname } = require('node:path'),
  { filename, loadFile, constants: { descriptionMaxLength, choicesMaxAmt, choiceValueMaxLength, choiceValueMinLength } } = require('./utils'),

  /* eslint-disable-next-line jsdoc/no-undefined-types -- false positive */
  /** @type {<T extends string>(str: T) => Capitalize<T>} */
  capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

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

class CommandOption {
  name;

  /** @type {string} */ description;
  descriptionLocalizations = {};

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
    if (config.strictAutocomplete) this.strictAutocomplete = config.strictAutocomplete;
    if (config.options) this.options = config.options.map(e => (e instanceof CommandOption ? e : new CommandOption(e)));

    this.name = config.name;
    this.type = config.type;

    this.autocompleteOptions = config.autocompleteOptions;
    this.choices = config.choices.map(e => ({ value: e }));

    this.channelTypes = config.channelTypes;

    this.minValue = config.minValue;
    this.maxValue = config.maxValue;

    this.minLength = config.minLength;
    this.maxLength = config.maxLength;
  }

  /** @type {CommandOptionT['init']} */
  init(i18n, parentId, logger = console) {
    this.#logger = logger;

    this.id = `${parentId}.options.${this.name}`;

    this.#validate();
    this.#localize(i18n);

    for (const option of this.options) option.init(i18n, this.id, logger);

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

  /**
   * @param {I18nProvider} i18n
   * @throws {Error} on not auto-fixable issues */
  #localize(i18n) {
    for (const [locale] of i18n.availableLocales) {
      const
        requiredTranslator = i18n.getTranslator({ locale, errorNotFound: true, backupPaths: [this.id] }),
        optionalTranslator = i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });

      ; /* eslint-disable-line @stylistic/no-extra-semi -- formatting reasons */

      // description
      const localizedDescription = locale == i18n.config.defaultLocale ? optionalTranslator('description') : requiredTranslator('description');
      if (localizedDescription?.length > descriptionMaxLength && !this.disabled)
        this.#logger.warn(`"${locale}" description for command "${this.name}" (${this.id}.description) is too long (max length is 100)! Slicing.`);

      if (locale == i18n.config.defaultLocale) this.description = localizedDescription.slice(0, descriptionMaxLength);
      else if (localizedDescription) this.descriptionLocalizations[locale] = localizedDescription.slice(0, descriptionMaxLength);
      else if (!this.disabled) this.#logger.warn(`Missing "${locale}" description for command "${this.name}" (${this.id}.description)`);


      // choices
      if ('choices' in this) {
        if (this.choices.length > choicesMaxAmt)
          throw new Error(`Too many choices (${this.choices.length}) found for option "${this.name}"). Max is ${choicesMaxAmt}.`);

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

            if (locale == i18n.config.defaultLocale) choice.name = localizedChoice;
            else choice.nameLocalizations[locale] = localizedChoice;
          }
          else if (choice.name != choice.value && !this.disabled) {
            this.#logger.warn(
              `Missing "${locale}" choice name localization for "${choice.value}" in option "${this.name}" (${this.id}.choices.${choice.value})`
            );
          }
        }
      }
    }
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

  /** @param {NonNullable<CommandOptionT['choices']>} choices */
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

  /** @param {NonNullable<CommandOptionT['channelTypes']>} channelTypes */
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
  types = [];
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

  /** @type {CommandOptionT[]} */ options = [];

  /** @type {string} */ #filePath;

  /** @type {Parameters<CommandT['init']>[0]} */ #i18n;
  /** @type {Parameters<CommandT['init']>['2']} */ #logger;

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

  /** @type {CommandT['init']} */
  init(i18n, filePath, logger = console) {
    this.#filePath = filePath;

    this.#i18n = i18n;
    this.#logger = logger;

    this.name = filename(this.#filePath).toLowerCase();
    this.category = basename(dirname(this.#filePath)).toLowerCase();
    this.id = `commands.${this.category}.${this.name}`;

    this.#validate();
    this.#localize();

    for (const option of this.options)
      option.init(this.#i18n, this.id, this.#logger);

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
  ...require('./utils'),
  loaders: require('./loaders')
};