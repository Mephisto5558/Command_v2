import type {
  AutocompleteFocusedOption, AutocompleteInteraction,
  BaseInteraction, ChatInputCommandInteraction, Message
} from 'discord.js';
import type { I18nProvider, Locale } from '@mephisto5558/i18n';
import type { Command, CommandType } from '..';

export { default as constants } from './constants';

export declare function autocompleteGenerator(
  this: AutocompleteInteraction | ChatInputCommandInteraction | Message,
  command: Command<CommandType[], boolean>,
  target: AutocompleteFocusedOption, i18n: I18nProvider, locale: Locale
): Promise<{ name: string | number; value: string | number }[] | undefined>;

/**
 * @returns The error key and replacement values for `lang()` or `false` if no error.
 * Returns `true` if error happend but has been handled internally. */
export declare function checkForErrors(
  this: BaseInteraction | Message,
  command: Command<CommandType[], boolean> | undefined, lang: lang
): Promise<[string, Record<string, string> | string | undefined] | boolean>;

export declare function commandExecutionWrapper(
  this: BaseInteraction | Message,
  command: Command<CommandType[], boolean> | undefined,
  commandType: string,
  lang: lang
): Promise<Message | undefined>;

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

export declare function permissionTranslator<T extends string | string[] | undefined>(
  perms?: T, locale?: Locale, i18n: I18nProvider
): T extends undefined ? [] : T extends string ? string : string[];