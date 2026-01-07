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
  /** @param {ConstructorParameters<typeof CommandT>[0]} config */
  constructor(config = {}) {
    this.aliases = config.aliases ?? {};
    this.aliases.slash ??= [];
    this.aliases.prefix ??= [];

    this.cooldowns = config.cooldowns ?? {};
    this.cooldowns.guild ??= 0;
    this.cooldowns.channel ??= 0;
    this.cooldowns.user ??= 0;

    this.commandTypes = config.commandTypes;
    this.dmPermission = !!config.dmPermission;

    this.disabled = !!config.disabled;
    this.disabledReason = config.disabledReason;

    this.noDefer = !!config.noDefer;
    this.ephemeralDefer = !!config.ephemeralDefer;

    this.options = config.options ?? [];

    this.run = config.run; /* eslint-disable-line custom/unbound-method */
  }
}

export class CommandOption {
  /** @param {ConstructorParameters<typeof CommandOptionT>[0]} config */
  constructor(config = {}) {
    this.name = config.name;
    this.type = config.type;
    this.required = !!config.required;

    this.cooldowns = config.cooldowns ?? {};
    this.cooldowns.guild ??= 0;
    this.cooldowns.channel ??= 0;
    this.cooldowns.user ??= 0;

    this.dmPermission = !!config.dmPermission;
    this.strictAutocomplete = !!config.strictAutocomplete;
    this.autocompleteOptions = config.autocompleteOptions;
  }
}