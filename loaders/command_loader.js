/**
 * @import { Command } from '..'
 * @import { Client } from 'discord.js' */


const
  { readdir } = require('node:fs/promises'),
  { resolve } = require('node:path'),
  { commandTypes } = require('..'),
  { getDirectories } = require('../utils');

let
  enabledCommandCount = 0,
  disabledCommandCount = 0;

/** @this {Client<false>} */
module.exports = async function commandLoader() {
  for (const subFolder of await getDirectories('./Commands')) {
    for (const file of await readdir(`./Commands/${subFolder}`, { withFileTypes: true })) {
      if (!file.name.endsWith('.js') && !file.isDirectory()) continue;

      const filePath = resolve(file.parentPath, file.name);

      /** @type {Command<['prefix'], boolean>} */
      let commandFile;
      try { commandFile = require(filePath); }
      catch (err) {
        if (err.code != 'MODULE_NOT_FOUND') throw err;
      }

      if (!commandFile?.types.includes(commandTypes.prefix)) continue;

      const command = commandFile.init(this.i18n, filePath, log);

      this.prefixCommands.set(command.name, command);
      if (command.disabled) {
        if (!this.config.hideDisabledCommandLog) log(`Loaded Disabled Prefix Command ${command.name}`);
      }
      else if (command.beta || this.botType != 'dev') log(`Loaded Prefix Command ${command.name}`);
      else if (!this.config.hideNonBetaCommandLog) log(`Loaded Non-Beta Prefix Command ${command.name}`);

      if (command.disabled || (this.botType == 'dev' && !command.beta)) disabledCommandCount++;
      else enabledCommandCount++;

      for (const alias of command.aliases?.prefix ?? []) {
        this.prefixCommands.set(alias, { ...command, name: alias, aliasOf: command.name });
        if (!command.disabled) log(`Loaded Alias ${alias} of Prefix Command ${command.name}`);
        else if (!this.config.hideDisabledCommandLog) log(`Loaded Alias ${alias} of Prefix Command ${command.name} (disabled)`);

        if (command.disabled || (this.botType == 'dev' && !command.beta)) disabledCommandCount++;
        else enabledCommandCount++;
      }
    }
  }

  log(`Loaded ${enabledCommandCount} Enabled Prefix Commands`);
  if (!this.config.hideDisabledCommandLog) log(`Loaded ${disabledCommandCount} Disabled/Non-Beta Prefix Commands`);
  console.log(); // empty line
};