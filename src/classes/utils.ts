import * as Discord from 'discord.js';
import { toMS } from 'type-better-ms';

import type { Locale, Translator } from '@mephisto5558/i18n';
import type {
  AllContexts, AutocompleteInteraction, ChatInputCommandInteraction, CommandInitialized as Command,
  CommandInteraction, CooldownType, Message, MessageComponentInteraction, validTimeString
} from '../index.ts';
import type { CommandOption } from './commandOption/index.ts';

export function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (!a?.toString() && !b?.toString()) return true;
  if (typeof a == 'string' || typeof b == 'string') return a == b;
  if (a == undefined && !Object.keys(b ?? {}).length || b == undefined && !Object.keys(a ?? {}).length) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const
    objA = a as Record<PropertyKey, unknown>,
    objB = b as Record<PropertyKey, unknown>,
    keysA = Object.entries(objA).filter(([,v]) => v !== undefined).map(e => e[0]),
    keysB = Object.entries(objB).filter(([,v]) => v !== undefined).map(e => e[0]);

  if (keysA.length !== keysB.length) return false;
  for (const key of keysA)
    if (!equal(objA[key], objB[key])) return false;

  return true;
}

export function cooldownConverter(
  cooldown: Partial<Record<CooldownType, validTimeString>>,
  k: keyof Command['cooldowns'], v: Command['cooldowns'][keyof Command['cooldowns']]
): [keyof Command['cooldowns'], number] {
  if (!cooldown[k]) return [k, v];

  const ms = toMS(cooldown[k]);
  if (typeof ms != 'number') throw new TypeError(`Could not convert time string cooldowns.${k} "${cooldown[k]}" to milliseconds.`);

  return [k, ms];
}

export class CommandExecutionError extends Error {
  override readonly name = 'CommandExecutionError';
  interaction: CommandInteraction | AutocompleteInteraction;
  translator: Translator<boolean, Locale>;

  constructor(
    /* eslint-disable-next-line unicorn/custom-error-definition -- default params must be last */
    message: string | undefined, interaction: CommandExecutionError['interaction'],
    translator: CommandExecutionError['translator'], options?: ErrorOptions
  ) {
    super(message, options);

    this.interaction = interaction;
    this.translator = translator;
  }
}

export class CommandValidationError<
  const CT extends readonly CommandType[],
  const CTX extends AllContexts
> extends Error {
  override readonly name = 'CommandValidationError';
  readonly command?: Command<NoInfer<CT>, NoInfer<CTX>>;
  readonly commandOption?: CommandOption<NoInfer<CT>, NoInfer<CTX>>;

  constructor(
    message: string | undefined,
    /* eslint-disable-next-line unicorn/custom-error-definition -- options is less important */
    command?: Command<NoInfer<CT>, NoInfer<CTX>>,
    commandOption?: CommandOption<NoInfer<CT>, NoInfer<CTX>>,
    options?: ErrorOptions
  ) {
    super(message, options);

    if (command) this.command = command;
    if (commandOption) this.commandOption = commandOption;
  }
}

export enum CommandType {
  Slash = 'slash',
  Prefix = 'prefix',
  Component = 'component'
}

export function resolveCommandType<I>(interaction: I): ExtendsMatch<I, [
  [Discord.ChatInputCommandInteraction | ChatInputCommandInteraction, CommandType.Slash],
  [Discord.Message | Message, CommandType.Prefix],
  [Discord.MessageComponentInteraction | MessageComponentInteraction, CommandType.Component]
]>;

/** @internal */
export function resolveCommandType(interaction: unknown): CommandType | undefined {
  if (interaction instanceof Discord.ChatInputCommandInteraction) return CommandType.Slash;
  if (interaction instanceof Discord.Message) return CommandType.Prefix;
  if (interaction instanceof Discord.MessageComponentInteraction) return CommandType.Component;
  return undefined;
}

export function isMessage(interaction: unknown): interaction is Message | Discord.Message {
  return resolveCommandType(interaction) == CommandType.Prefix
    && interaction instanceof Discord.Message;
}

export function isInteraction(
  interaction: unknown, commandType: CommandType | CommandType[] = [CommandType.Slash, CommandType.Component]
): interaction is Discord.BaseInteraction {
  return (Array.isArray(commandType) ? commandType : [commandType]).includes(resolveCommandType(interaction))
    && interaction instanceof Discord.BaseInteraction;
}

export function isSlash(interaction: unknown): interaction is ChatInputCommandInteraction | Discord.ChatInputCommandInteraction {
  return isInteraction(interaction, CommandType.Slash) && interaction.isChatInputCommand();
}

export function isComponent(interaction: unknown): interaction is MessageComponentInteraction | Discord.MessageComponentInteraction {
  return isInteraction(interaction, CommandType.Component) && interaction.isMessageComponent();
}