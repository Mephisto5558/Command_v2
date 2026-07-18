/* eslint-disable-next-line import-x/no-unassigned-import, import-x/no-empty-named-blocks, unicorn/require-module-specifiers
  -- load global types */
import type {} from '@mephisto5558/better-types';

/* eslint-disable-next-line import-x/order -- load global types first */
import * as Discord from 'discord.js';

import type { Locale, Translator } from '@mephisto5558/i18n';
import type { Command } from './classes/command/index.ts';
import type { CommandOptionUninitialized } from './classes/commandOption/index.ts';
import type { CommandOptionConfig } from './classes/commandOption/utils.ts';
import type { CommandType } from './classes/utils.ts';

export * from './utils/index.ts';
export * from './discord.js.ts';
export type * from './db.ts';

export { CommandUninitialized as Command } from './classes/command/index.ts';
export type { Command as CommandInitialized } from './classes/command/index.ts';

export { CommandOptionUninitialized as CommandOption } from './classes/commandOption/index.ts';
export type { CommandOption as CommandOptionInitialized } from './classes/commandOption/index.ts';

export { CommandManager } from './classes/commandManager/index.ts';
export type { CollectionMember as CommandManagerMember } from './classes/commandManager/index.ts';
export { CommandExecutionError, CommandType, isComponent, isInteraction, isMessage, isSlash, resolveCommandType } from './classes/utils.ts';

export enum PermissionType {
  Client = 0,
  Role = 1,
  User = 2,
  Channel = 3
}

export type CommandInteraction = Discord.CommandInteraction | Discord.Message | Discord.MessageComponentInteraction;

export const AllContexts = [Discord.InteractionContextType.Guild, Discord.InteractionContextType.BotDM] as const;
/* eslint-disable-next-line @typescript-eslint/no-redeclare -- type vs const */
export type AllContexts = readonly typeof AllContexts[number][];

export type HasGuild<CTX extends AllContexts> = Extends<Discord.InteractionContextType.Guild, CTX[number]>;
export type HasDM<CTX extends AllContexts>
  = Not<ExtendsNever<CTX[number] & (Discord.InteractionContextType.BotDM | Discord.InteractionContextType.PrivateChannel)>>;

export type ContextToInGuild<CTX extends AllContexts>
  = If<HasGuild<CTX>, {
    ifTrue: If<HasDM<CTX>, { ifTrue: boolean; ifFalse: true }>;
    ifFalse: false;
  }>;
export type ContextToCaching<CTX extends AllContexts>
  = If<HasGuild<CTX>, {
    ifTrue: If<HasDM<CTX>, { ifTrue: 'cached' | undefined; ifFalse: 'cached' }>;
    ifFalse: undefined;
  }>;

type BuildOrderedCooldown<T extends readonly string[]>
  = T extends [infer Head extends string, ...infer Tail extends string[]]
    ? `${number}${Head}` | `${number}${Head}${BuildOrderedCooldown<Tail>}` | BuildOrderedCooldown<Tail>
    : never;

/**
 * This is more limited than what's actually allowed to enforce consitency.
 *
 * day, hour, minute, second, millisecond */
type TimeUnits = ['d', 'h', 'min', 's', 'ms'];
export type validTimeString = BuildOrderedCooldown<TimeUnits>;

export type Logger = Pick<Console, 'debug' | 'log' | 'warn' | 'error'>;

export type OptionsG<CT extends readonly CommandType[], CTX extends AllContexts, AO = undefined>
  = readonly (CommandOptionConfig<CT, CTX, AO> | CommandOptionUninitialized<CT, CTX, AO>)[];

export enum CooldownType {
  Guild = 'guild',
  Channel = 'channel',
  User = 'user'
}
type Cooldowns = Record<CooldownType, validTimeString>;

export interface SharedConfig<CTX extends AllContexts> {
  cooldowns?: Partial<Cooldowns>;

  contexts?: CTX;

  disabled?: boolean;
  disabledReason?: string;
}


export type commandDoneFn<CMD extends Command<readonly CommandType[], AllContexts> = Command<readonly CommandType[], AllContexts>>
  = (this: ThisParameterType<CMD['run']>, command: CMD, lang: Translator<false, Locale>) => Promise<never>;


type customPermissionCheckFnParams<CT extends readonly CommandType[], CTX extends AllContexts> = [
  interaction: ThisParameterType<Command<NoInfer<CT>, NoInfer<CTX>>['run']>,
  author: Discord.User, translator: Translator<false, Locale>
];

/**
 * @returns If a permsision error was found: Parameters for `Translator`
 * @returns If a permission error was handled by the function: `true`
 * @returns If no permission error was found: `false` */
export type customPermissionChecksFn<
  CT extends readonly CommandType[] = readonly CommandType[], CTX extends AllContexts = AllContexts,
  RetMsgs extends Parameters<Translator> = Parameters<Translator>

  // Split because TS otherwise ignores non-promise return
> = ((this: Command<NoInfer<CT>, NoInfer<CTX>>, ...args: customPermissionCheckFnParams<NoInfer<CT>, NoInfer<CTX>>) => RetMsgs | boolean)
  | ((this: Command<NoInfer<CT>, NoInfer<CTX>>, ...args: customPermissionCheckFnParams<NoInfer<CT>, NoInfer<CTX>>) => Promise<RetMsgs | boolean>);