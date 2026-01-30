/**
 * @import { ChatInputCommandInteraction } from 'discord.js'
 * @import { Command, CommandType } from '../index.js'  */

const
  { Colors, EmbedBuilder, Message, MessageFlags, PermissionFlagsBits, inlineCode } = require('discord.js'),
  permissionTranslator = require('./permissionTranslator'),

  CANNOT_SEND_MESSAGE_API_ERR = 50_007,
  PERM_ERR_MSG_DELETETIME = 1e4;

/**
 * @this {ChatInputCommandInteraction<'cached'> | Message<true>}
 * @param {Command<CommandType[], boolean>} command
 * @param {lang} lang
 * @returns {Promise<boolean>} `false` if no permission issues have been found. */
async function checkPerms(command, lang) {
  const
    userPermsMissing = this.member.permissionsIn(this.channel).missing([...command.permissions?.user ?? [], PermissionFlagsBits.SendMessages]),
    botPermsMissing = this.guild.members.me.permissionsIn(this.channel)
      .missing([...command.permissions?.client ?? [], PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]);

  if (!botPermsMissing.length && !userPermsMissing.length) return false;

  const embed = new EmbedBuilder({
    title: lang('permissionDenied.embedTitle'),
    description: lang(`permissionDenied.embedDescription${userPermsMissing.length ? 'User' : 'Bot'}`, {
      permissions: permissionTranslator(botPermsMissing.length ? botPermsMissing : userPermsMissing,
        lang.config.locale, this.client.i18n).map(inlineCode).join(', ')
    }),
    color: Colors.Red
  });

  if (botPermsMissing.includes('SendMessages') || botPermsMissing.includes('ViewChannel')) {
    if (this instanceof Message && this.guild.members.me.permissionsIn(this.channel).has(PermissionFlagsBits.AddReactions)) {
      await this.react('❌');
      void this.react('✍️'); // don't need to wait here
    }

    try { await (this instanceof Message ? this.author : this.user).send({ content: this.url, embeds: [embed] }); }
    catch (err) {
      if (err.code != CANNOT_SEND_MESSAGE_API_ERR) throw err;
    }
  }
  else await this.customReply({ embeds: [embed], flags: MessageFlags.Ephemeral }, this instanceof Message ? PERM_ERR_MSG_DELETETIME : 0);

  return true;
}