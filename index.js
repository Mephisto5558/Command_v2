/** @import { Command as CommandT, CommandOption as CommandOptionT } from '.' */

module.exports = {
  ...require('./utils'),
  loaders: require('./loaders')
};

export const commandTypes = {
  slash: 'slash',
  prefix: 'prefix'
};

export class Command {
  usage = { usage: undefined, examples: undefined };
  aliases = { slash: [], prefix: [] };
  cooldowns = { guild: 0, channel: 0, user: 0 };
  permissions = { client: [], user: [] };
  dmPermission = false;

  disabled = false;
  disabledReason;

  noDefer = false;
  ephemeralDefer = false;

  options = [];

  /** @param {ConstructorParameters<typeof CommandT>[0]} config */
  constructor(config = {}) {
    if (config.usage) {
      if (config.usage.usage) this.usage.usage = config.usage.usage;
      if (config.usage.examples) this.usage.examples = config.usage.examples;
    }

    if (config.aliases) {
      if (config.aliases.slash) this.aliases.slash = config.aliases.slash;
      if (config.aliases.prefix) this.aliases.prefix = config.aliases.prefix;
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

  /** @type {CommandT['isEqualTo']} */
  isEqualTo(cmd) {
    if (!cmd) return false;
    if (
      this.name != cmd.name || this.description != cmd.description || this.type != cmd.type
      || this.dmPermission != cmd.dmPermission
      || this.defaultMemberPermissions?.bitfield != cmd.defaultMemberPermissions?.bitfield
      || !equal(this.nameLocalizations, cmd.nameLocalizations)
      || !equal(this.descriptionLocalizations, cmd.descriptionLocalizations)
    ) return false;

    if ((this.options?.length ?? 0) != (cmd.options?.length ?? 0)) return false;
    if (this.options?.length) {
      for (const option of this.options) {
        const other = cmd.options.find(e => e.name == option.name);
        if (!other || !option.isEqualTo(other)) return false;
      }
    }
    return true;
  }
}

export class CommandOption {
  name;
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

  /** @param {ConstructorParameters<typeof CommandOptionT>[0]} config */
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
    this.choices = config.choices;
    this.channelTypes = config.channelTypes;
  }

  /** @type {CommandOptionT['isEqualTo']} */
  isEqualTo(opt) {
    if (!opt) return false;
    if (
      this.name != opt.name || this.description != opt.description || this.type != opt.type
      || this.autocomplete != opt.autocomplete || !!this.required != !!opt.required
      || this.minValue != opt.minValue || this.maxValue != opt.maxValue
      || this.minLength != opt.minLength || this.maxLength != opt.maxLength
      || !equal(this.nameLocalizations, opt.nameLocalizations)
      || !equal(this.descriptionLocalizations, opt.descriptionLocalizations)
    ) return false;

    if (!this.#choicesEqualTo(opt.choices)) return false;
    if (!this.#channelTypesEqualTo(opt.channelTypes)) return false;

    if ((this.options?.length ?? 0) != (opt.options?.length ?? 0)) return false;
    if (this.options?.length) {
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
}

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