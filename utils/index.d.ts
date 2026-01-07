import type {
  AutocompleteFocusedOption, AutocompleteInteraction,
  BaseInteraction, ChatInputCommandInteraction, Message
} from 'discord.js';
import type { I18nProvider, Locale } from '@mephisto5558/i18n';
import type { Command, CommandOption, CommandType } from '..';
import type { Database } from '../types/database';

export { default as constants } from './constants';

export declare function autocompleteGenerator(
  this: AutocompleteInteraction | ChatInputCommandInteraction | Message,
  command: Command<CommandType[], boolean>,
  target: AutocompleteFocusedOption, locale: Locale
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
  commandType: Exclude<keyof Database['botSettings']['cmdStats'][string], 'createdAt'>,
  lang: lang
): Promise<Message | undefined>;

export declare function cooldowns(
  this: BaseInteraction | Message,
  name: string, cooldowns?: Record<'user' | 'guild' | 'channel', number>
): number;

/** @throws {Error} on non-autofixable invalid data */
export declare function formatCommand<T extends Command | CommandOption>(
  option: T, path: string, id: string, i18n: I18nProvider
): T;

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

export declare function localizeUsage<CMD extends Command>(
  command: CMD, path: string, i18n: I18nProvider
): [CMD['usage'], Record<string, CMD['usage']>] | [];

export declare function permissionTranslator<T extends string | string[] | undefined>(
  perms?: T, locale?: Locale, i18n: I18nProvider
): T extends undefined ? [] : T extends string ? string : string[];

export declare function slashCommandsEqual<T extends Command<CommandType[], boolean> | CommandOption<CommandType[], boolean> | undefined>(
  a: T, b: T
): boolean;