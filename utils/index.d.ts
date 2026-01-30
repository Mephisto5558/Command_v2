import type { BaseInteraction, Message } from 'discord.js';
import type { I18nProvider, Locale } from '@mephisto5558/i18n';

export { default as constants } from './constants';

export declare function capitalize<T extends string>(str: T): Capitalize<T>;

/** Formats an application command name and id into a command mention. */
export declare function commandMention<CommandName extends string, CommandId extends Snowflake>(
  name: CommandName, id: CommandId
): `</${CommandName}:${CommandId}>`;

export declare function cooldowns(
  this: BaseInteraction | Message,
  name: string, cooldowns?: Record<'user' | 'guild' | 'channel', number>
): number;

export declare function filename(path: string): string;

export declare function getCommands(
  this: Client,
  lang: lang<true>
): {
  category: string;
  subTitle: '';
  aliasesDisabled: boolean;
  list: {
    commandName: string;
    commandUsage: string;
    commandDescription: string;
    commandAlias: string;
  }[];
}[];

export declare function getDirectories(
  path: string
): Promise<string>;

export declare function loadFile(
  path: string
): Promise<unknown>;

export declare function permissionTranslator<T extends string | string[] | undefined>(
  perms?: T, locale?: Locale, i18n: I18nProvider
): T extends undefined ? [] : T extends string ? string : string[];