/**
 * @import { Client } from 'discord.js'
 * @import { Translator } from '@mephisto5558/i18n'
 * @import { commandExecutionWrapper as commandExecutionWrapperT } from './index.js' */

const
  { ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags } = require('discord.js'),
  checkForErrors = require('./checkForErrors');

class CommandExecutionError extends Error {
  name = 'CommandExecutionError';

  /**
   * @param {string | undefined} message
   * @param {Client} client
   * @param {ThisParameterType<commandExecutionWrapperT>} interaction
   * @param {Translator} lang
   * @param {ErrorOptions | undefined} options */
  constructor(message, client, interaction, lang, options) {
    super(message, options);

    this.client = client;
    this.interaction = interaction;
    this.lang = lang;
  }
}

/** @type {commandExecutionWrapperT} */
module.exports = async function commandExecutionWrapper(command, commandType, lang) {
  lang.config.backupPaths[0] = 'events.command';

  const errorKey = await checkForErrors.call(this, command, lang);
  if (errorKey !== false) {
    if (errorKey === true) return;
    return this.customReply({ embeds: [new EmbedBuilder({ description: lang(...errorKey), color: Colors.Red })], flags: MessageFlags.Ephemeral });
  }

  const
    commandName = (command.aliasOf ?? command).name,

    cmdLang = this.client.i18n.getTranslator({
      locale: lang.config.locale, backupPaths: command ? [`commands.${command.category}.${commandName}`] : undefined
    });

  this.commandName ??= commandName; // Is undefined on `MessageComponentInteraction`s

  log.debug(`Executing ${commandType} command ${commandName}`);

  if (!command.noDefer && this instanceof ChatInputCommandInteraction && !this.replied)
    await this.deferReply({ flags: command.ephemeralDefer ? MessageFlags.Ephemeral : undefined });

  try {
    await command.run.call(this, cmdLang);

    if (!this.client.settings.cmdStats[commandName]?.createdAt)
      await this.client.db.update('botSettings', `cmdStats.${commandName}.createdAt`, new Date());

    if (this.client.botType != 'dev') {
      await this.client.db.update(
        'botSettings', `cmdStats.${commandName}.${commandType}`,
        (this.client.settings.cmdStats[commandName]?.[commandType] ?? 0) + 1
      );
      await this.user.updateDB(`cmdStats.${commandName}.${commandType}`, (this.user.db.cmdStats?.[commandName]?.[commandType] ?? 0) + 1);
      if (this.inGuild())
        await this.guild.updateDB(`cmdStats.${commandName}.${commandType}`, (this.guild.db.cmdStats?.[commandName]?.[commandType] ?? 0) + 1);
    }
  }
  catch (err) { throw new CommandExecutionError(err.message, this.client, this, lang, { cause: err }); }
};