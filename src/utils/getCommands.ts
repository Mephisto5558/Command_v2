import { CommandType } from '../classes/utils.ts';
import { capitalize } from './capitalize.ts';

import type * as Discord from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type { CommandInitialized as Command, CommandManager } from '../index.ts';

type category = { category: string; subTitle: ''; aliasesDisabled: boolean; list: command[] };
type command = { commandName: string; commandUsage: string; commandDescription: string; commandAlias: string };

export function getCommands(
  this: Discord.Client,
  lang: Translator<true, Locale>,
  commands: CommandManager['commands'],
  excludeCategories?: Command['category'][]
): category[] {
  const commandList = commands.reduce<category[]>((acc, { command }) => {
    if (excludeCategories?.includes(command.category) || command.disabled) return acc;

    let category = acc.find(e => e.category == command.category);
    if (!category) {
      category = {
        category: command.category,
        subTitle: '',
        aliasesDisabled: false,
        list: []
      };
      acc.push(category);
    }

    category.list.push({
      commandName: command.name,
      commandUsage: (
        (command.types.includes(CommandType.Slash) ? lang('others.getCommands.lookAtOptionDesc') ?? '' : '')
        /* eslint-disable-next-line security/detect-non-literal-regexp -- this is basically literal */
        + (lang(`${command.id}.usage.usage`)?.replaceAll(new RegExp(`${CommandType.Slash} command:`, 'gi'), '') ?? '')
        || (lang('others.getCommands.noInfo') ?? '')
      ).trim().replaceAll('\n', '<br>&nbsp'),
      commandDescription: command.descriptionLocalizations[lang.config.locale ?? lang.defaultConfig.defaultLocale] ?? command.description,
      commandAlias: (
        (command.aliases[CommandType.Prefix].length ? `${capitalize(CommandType.Prefix)}: ${command.aliases[CommandType.Prefix].join(', ')}\n` : '')
        + (command.aliases[CommandType.Slash].length ? `${capitalize(CommandType.Slash)}: ${command.aliases[CommandType.Slash].join(', ')}` : '')
        || (lang('global.none') ?? '')
      ).trim().replaceAll('\n', '<br>&nbsp')
    });

    return acc;
  }, []);

  commandList.sort((a, b) => a.category == 'others' ? 1 : b.list.length - a.list.length);
  return commandList.map(e => {
    e.category = lang(`commands.${e.category}.categoryName`) ?? '';
    e.aliasesDisabled = e.list.every(e => e.commandAlias == lang('global.none'));
    return e;
  });
}