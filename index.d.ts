import type { ApplicationCommandOptionType, AutocompleteInteraction, PermissionFlags } from 'discord.js';
import type * as __ from '@mephisto5558/better-types'; /* eslint-disable-line import-x/no-namespace -- load in global definitions */
import type { Translator } from '@mephisto5558/i18n';

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
  dmPermission: runsInDM;
  commandTypes: commandTypes;

  constructor(config: {
    usage?: Partial<Record<'usage' | 'examples', string>>;
    aliases?: Partial<Record<NoInfer<commandTypes>[number], string[]>>;
    cooldowns?: Partial<Record<'guild' | 'channel' | 'user', number>>;
    permissions?: Partial<Record<'client' | 'user', (keyof PermissionFlags)[]>>;
    commandTypes: commandTypes;
    dmPermission?: runsInDM;
    disabled?: boolean;
    disabledReason?: string;
    noDefer?: boolean;
    ephemeralDefer?: boolean;

    options?: CommandOption<NoInfer<commandTypes>>[];

    beta?: true;

    run(
      this: ResolveContext<{ slash: Interaction; prefix: Message }, NoInfer<commandTypes>>,
      lang: Translator, client: Client
    ): Promise<never>;
  });
}

export declare class CommandOption<
  const commandTypes extends readonly CommandType[] = [],
  const runsInDM extends boolean = false
> {
  constructor(config: {
    name: string;
    type: keyof typeof ApplicationCommandOptionType;
    required?: boolean;
    cooldowns?: ConstructorParameters<typeof Command>[0]['cooldowns'];
    dmPermission?: runsInDM;
    options?: CommandOption<commandTypes>[];
    autocompleteOptions?: string | autocompleteOptions[] | (
      (
        this: ResolveContext<{ slash: AutocompleteInteraction<'cached'>; prefix: Message }, commandTypes>,
        query: string
      ) => autocompleteOptions[] | Promise<autocompleteOptions>
    );
  });
}