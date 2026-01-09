/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  ApplicationCommand, ApplicationCommandOption, ApplicationCommandOptionType, ApplicationCommandType, AutocompleteInteraction,
  ChannelType, PermissionFlags, _NonNullableFields
} from 'discord.js';
import type * as __ from '@mephisto5558/better-types'; /* eslint-disable-line import-x/no-namespace -- load in global definitions */
import type { Locale, Translator } from '@mephisto5558/i18n';

export * from './utils/index.js';
export * as loaders from './loaders';

type ResolveContext<MAP, KEYS extends (keyof MAP)[]> = MAP[KEYS[number]];

type autocompleteOptions = string | number | { name: string; value: string };
export type CommandType = 'slash' | 'prefix';

export declare const commandTypes: { readonly [K in CommandType]: K };

type StrictCommand<CT extends readonly CommandType[], DM extends boolean> = Command<NoInfer<CT>, NoInfer<DM>>;
type StrictCommandOption<CT extends readonly CommandType[], DM extends boolean, AO = never> = CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>>;

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export interface CommandConfig<CT extends readonly CommandType[], DM extends boolean> {
  types: CT;
  usage?: { usage?: string; examples?: string } & {};
  aliases?: { [K in NoInfer<CT>[number]]?: string[] } & {};
  cooldowns?: { guild?: number; channel?: number; user?: number } & {};
  permissions?: { client?: PermissionFlags[]; user?: PermissionFlags[] } & {};
  dmPermission?: DM;

  disabled?: boolean;
  disabledReason?: string;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  options?: (StrictCommandOption<CT, DM> | CommandOptionConfig<CT, DM>)[];

  beta?: true;

  run: StrictCommand<CT, DM>['run'];
}

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export interface CommandOptionConfig<CT extends readonly CommandType[], DM extends boolean, AO = never> {
  name: string;
  type: keyof typeof ApplicationCommandOptionType;
  required?: boolean;
  cooldowns?: { guild?: number; channel?: number; user?: number } & {};
  dmPermission?: DM;

  disabled?: boolean;
  disabledReason?: string;

  strictAutocomplete?: boolean;
  autocompleteOptions?: StrictCommandOption<CT, DM, AO>['autocompleteOptions'];

  choices?: StrictCommandOption<CT, DM, AO>['choices'];

  channelTypes?: ChannelType[];

  minValue?: number;
  maxValue?: number;

  minLength?: number;
  maxLength?: number;

  options?: (StrictCommandOption<CT, DM> | CommandOptionConfig<CT, DM>)[];

  run?: StrictCommandOption<CT, DM, AO>['run'];
}

export declare class Command<
  const commandTypes extends readonly CommandType[] = [],
  const runsInDM extends boolean = false
> {
  name: string;
  aliasOf?: Command;

  /** Currently not used */
  nameLocalizations?: Record<Locale, string>;

  description: string;
  descriptionLocalizations: Record<Locale, string>;

  category: string;

  type: ApplicationCommandType;
  types: commandTypes;
  usage: { [K in 'usage' | 'examples']: string | undefined } & {};
  aliases: { [K in NoInfer<commandTypes>[number]]: string[] } & {};
  cooldowns: { [K in 'guild' | 'channel' | 'user']: number } & {};
  permissions: { [K in 'client' | 'user']: PermissionFlags[] } & {};
  dmPermission: runsInDM;

  disabled: boolean;
  disabledReason: string | undefined;

  noDefer: boolean;
  ephemeralDefer: boolean;

  options: StrictCommandOption<commandTypes, runsInDM>[];

  beta?: boolean;

  run: (
    this: ResolveContext<{
      slash: Interaction<runsInDM extends false ? true : false>;
      prefix: Message<runsInDM extends false ? true : false>;
    }, NoInfer<commandTypes>>,
    lang: Translator, client: Client
  ) => Promise<never>;

  constructor(config: CommandConfig<commandTypes, runsInDM>);

  isEqualTo(cmd: Command<CommandType[] | ApplicationCommand, boolean>): boolean;
}

export declare class CommandOption<
  const commandTypes extends readonly CommandType[] = [],
  const runsInDM extends boolean = false,
  const additionalRunOpts = never
> {
  name: string;

  /** Currently not used */
  nameLocalizations?: Record<Locale, string>;
  description: string;
  descriptionLocalizations: Record<Locale, string>;

  type: ApplicationCommandOptionType;

  required: boolean;
  cooldowns: { [K in 'guild' | 'channel' | 'user']: number } & {};
  dmPermission: runsInDM;

  disabled: boolean;
  disabledReason: string | undefined;

  get autocomplete(): boolean;
  strictAutocomplete: boolean;
  autocompleteOptions: autocompleteOptions | autocompleteOptions[] | (
      (
        this: ResolveContext<{ slash: AutocompleteInteraction<'cached'>; prefix: Message }, NoInfer<commandTypes>>,
        query: string
      ) => autocompleteOptions[] | Promise<autocompleteOptions>
    ) | undefined;

  choices: {
    name: string;
    nameLocalizations?: Record<Locale, string>;
    value: string | number;
  }[] | undefined;

  channelTypes: ChannelType[] | undefined;

  minValue?: number;
  maxValue?: number;

  minLength?: number;
  maxLength?: number;

  options: StrictCommandOption<commandTypes, runsInDM>[];

  run: (
    this: ThisParameterType<StrictCommand<commandTypes, runsInDM>['run']>,
    lang: Translator, options: additionalRunOpts, client: Client
  ) => Promise<never>;

  constructor(config: CommandOptionConfig<commandTypes, runsInDM, additionalRunOpts>);

  isEqualTo(opt: CommandOption<CommandType[], boolean> | ApplicationCommandOption): boolean;
}