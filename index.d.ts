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

  usage: Record<'usage' | 'examples', string | undefined>;
  aliases: Partial<Record<NoInfer<commandTypes>[number], string[]>>;
  cooldowns: Record<'guild' | 'channel' | 'user', number>;
  permissions: Record<'client' | 'user', PermissionFlags[]>;
  commandTypes: commandTypes;
  dmPermission: runsInDM;
  disabled: boolean;
  disabledReason: string | undefined;
  noDefer: boolean;
  ephemeralDefer: boolean;

  options: CommandOption<NoInfer<commandTypes>, NoInfer<runsInDM>>[];

  beta?: boolean;

  run: (
    this: ResolveContext<{ slash: Interaction; prefix: Message }, NoInfer<commandTypes>>,
    lang: Translator, client: Client
  ) => Promise<never>;

  constructor(config: {
    usage?: Partial<_NonNullableFields<Command<NoInfer<commandTypes>, NoInfer<runsInDM>>['usage']>>;
    aliases?: Command<NoInfer<commandTypes>, NoInfer<runsInDM>>['aliases'];
    cooldowns?: Partial<Command<NoInfer<commandTypes>, NoInfer<runsInDM>>['cooldowns']>;
    permissions?: Partial<Record<keyof Command<NoInfer<commandTypes>, NoInfer<runsInDM>>['permissions'], (keyof PermissionFlags)[]>>;
    commandTypes: commandTypes;
    dmPermission?: runsInDM;
    disabled?: boolean;
    disabledReason?: string;
    noDefer?: boolean;
    ephemeralDefer?: boolean;

    options?: Command<NoInfer<commandTypes>, NoInfer<runsInDM>>['options'];

    beta?: true;

    run: Command<NoInfer<commandTypes>, NoInfer<runsInDM>>['run'];
  });

  isEqualTo(cmd: Command<CommandType[] | ApplicationCommand, boolean>): boolean;
}

export declare class CommandOption<
  const commandTypes extends readonly CommandType[] = [],
  const runsInDM extends boolean = false
> {
  name: string;

  /** Currently not used */
  nameLocalizations?: Command<NoInfer<commandTypes>, NoInfer<runsInDM>>['nameLocalizations'];
  description: string;
  descriptionLocalizations: Record<Locale, string>;

  type: ApplicationCommandOptionType;

  required: boolean;
  cooldowns: Command<NoInfer<commandTypes>, NoInfer<runsInDM>>['cooldowns'];
  dmPermission: runsInDM;
  get autocomplete(): boolean;
  strictAutocomplete: boolean;
  autocompleteOptions: autocompleteOptions | autocompleteOptions[] | (
      (
        this: ResolveContext<{ slash: AutocompleteInteraction<'cached'>; prefix: Message }, commandTypes>,
        query: string
      ) => autocompleteOptions[] | Promise<autocompleteOptions>
    ) | undefined;

  choices: {
    name: string;
    nameLocalizations?: CommandOption<NoInfer<commandTypes>, NoInfer<runsInDM>>['nameLocalizations'];
    value: string | number;
  }[] | undefined;

  channelTypes: ChannelType[] | undefined;

  options: CommandOption<commandTypes, runsInDM>[];

  constructor(config: {
    name: string;
    type: keyof typeof ApplicationCommandOptionType;
    required?: boolean;
    cooldowns?: ConstructorParameters<typeof Command<NoInfer<commandTypes>, NoInfer<runsInDM>>>[0]['cooldowns'];
    dmPermission?: runsInDM;

    strictAutocomplete?: boolean;
    autocompleteOptions?: NonNullable<CommandOption<commandTypes, runsInDM>['autocompleteOptions']>;

    choices?: NonNullable<CommandOption<commandTypes, runsInDM>['choices']>;

    channelTypes?: (keyof typeof ChannelType)[];

    options?: CommandOption<commandTypes, runsInDM>['options'];
  });

  isEqualTo(opt: CommandOption<CommandType[], boolean> | ApplicationCommandOption): boolean;
}