import { ContextType } from '../../index.ts';

import type * as Discord from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type {
  AllContexts, AutocompleteInteraction, ChatInputCommandInteraction,
  CommandInitialized as Command, CommandOptionInitialized as CommandOption,
  Message, MessageComponentInteraction, OptionsG, SharedConfig
} from '../../index.ts';
import type { CommandType } from '../utils.ts';

export const DefaultContext = [ContextType.Guild] as const;
/* eslint-disable-next-line @typescript-eslint/no-redeclare -- type vs const */
export type DefaultContext = typeof DefaultContext;

export type autocompleteObject = Pick<Discord.ApplicationCommandOptionChoiceData, 'name' | 'value'>;
export type autocompleteOption = autocompleteObject['value'] | autocompleteObject;
export type autocompleteFunction<CT extends readonly CommandType[], CTX extends AllContexts> = (
  this: ExtendsMultiMatch<CommandType, CT, [
    [CommandType.Slash, AutocompleteInteraction<NoInfer<CTX>>],
    [CommandType.Prefix, Message<NoInfer<CTX>>]
  ]>,
  query: string
) => autocompleteOption[] | undefined | Promise<autocompleteOption[] | undefined>;

export type autocompleteOptions<CT extends readonly CommandType[], CTX extends AllContexts>
  = autocompleteOption | autocompleteOption[] | autocompleteFunction<CT, CTX>;

// #region option resolver
export type MapChannelTypes<CT extends readonly Discord.ChannelType[]> = ShallowPrettify<Extract<Discord.Channel, { type: CT[number] }>>;

export type FallbackChannels<CT extends readonly CommandType[], CTX extends AllContexts>
  = ExtendsMultiMatch<CommandType, CT, [
    [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>>],
    [CommandType.Component, MessageComponentInteraction<NoInfer<CTX>> & { commandName: Command['name'] }],
    [CommandType.Prefix, Message<NoInfer<CTX>>]
  ]>['channel'];

// #endregion option resolver

// #region option config
interface BaseOptionConfig {
  name: CommandOption['name'];
  nameLocalizations?: Partial<Record<Locale, Command['name']>>;
}

interface BaseSubcommandConfig<
  CTX extends AllContexts
> extends SharedConfig<CTX>, BaseOptionConfig {}

interface BasePrimitiveCommandOptionConfig<CT extends readonly CommandType[], CTX extends AllContexts>
  extends BaseOptionConfig {
  required?: boolean;
  strictAutocomplete?: boolean;
  autocompleteOptions?: autocompleteOptions<CT, CTX>;
  choices?: readonly Discord.ApplicationCommandOptionChoiceData['value'][];
}
type AlwaysOmitted = keyof Pick<Discord.ApplicationCommandOption, 'description' | 'descriptionLocalizations'>;

type OptionOmit<Src extends object, Custom extends object, Extra extends keyof LooseOmit<Src, keyof Custom | AlwaysOmitted> = never>
  = LooseOmit<Src, keyof Custom | AlwaysOmitted | Extra>;

export interface SubcommandGroupConfig<
  CT extends readonly CommandType[], CTX extends AllContexts, AO = never,
  ChildrenOptions extends readonly SubcommandConfig<CT, CTX, unknown>[]
  /* | readonly CommandOption<CT, CTX, AO>[] */ = readonly SubcommandConfig<CT, CTX, unknown>[]
  // | readonly CommandOption<CT, CTX, AO>[]
> extends BaseSubcommandConfig<CTX>, OptionOmit<Discord.ApplicationCommandSubGroup, BaseSubcommandConfig<CTX>, 'options'> {
  options: ChildrenOptions;

  run?(
    this: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Component, MessageComponentInteraction<NoInfer<CTX>> & { commandName: Command['name'] }],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    lang: Translator<false, Locale>, options: NoInfer<AO>,
    data: {
      client: Discord.Client<true>;
      option: CommandOption<CT, CTX, AO, ChildrenOptions, Discord.ApplicationCommandOptionType.SubcommandGroup>;
    }
  ): unknown;
}

export interface SubcommandConfig<
  CT extends readonly CommandType[], CTX extends AllContexts, AO = undefined,
  ChildrenOptions extends (
    readonly PrimitiveCommandOptionConfig<CT, CTX>[]

  // | readonly CommandOptionUninitialized<CT, CTX, AO, never, PrimitiveCommandOptionConfig<CT, CTX>['type']>[]
  ) = (
    readonly PrimitiveCommandOptionConfig<CT, CTX>[]

  // | readonly CommandOptionUninitialized<CT, CTX, AO, never, PrimitiveCommandOptionConfig<CT, CTX>['type']>[]
  )
> extends BaseSubcommandConfig<CTX>, OptionOmit<Discord.ApplicationCommandSubCommand, BaseSubcommandConfig<CTX>, 'options'> {
  options?: ChildrenOptions;

  run?(
    this: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Component, MessageComponentInteraction<NoInfer<CTX>> & { commandName: Command['name'] }],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    lang: Translator<false, Locale>, options: NoInfer<AO>,
    data: {
      client: Discord.Client<true>;
      option: CommandOption<CT, CTX, AO, ChildrenOptions, Discord.ApplicationCommandOptionType.Subcommand>;
    }
  ): unknown;
}

export interface StringCommandOptionConfig<CT extends readonly CommandType[], CTX extends AllContexts>
  extends BasePrimitiveCommandOptionConfig<CT, CTX>,
  OptionOmit<Discord.ApplicationCommandStringOption, BasePrimitiveCommandOptionConfig<CT, CTX>> {}

export interface NumericCommandOptionConfig<
  CT extends readonly CommandType[], CTX extends AllContexts,
  T extends Discord.ApplicationCommandNumericOption['type'] = Discord.ApplicationCommandNumericOption['type']
> extends BasePrimitiveCommandOptionConfig<CT, CTX>,
  OptionOmit<Discord.ApplicationCommandNumericOption, BasePrimitiveCommandOptionConfig<CT, CTX>> {
  type: T;
}

export interface ChannelCommandOptionConfig extends BaseOptionConfig, OptionOmit<Discord.ApplicationCommandChannelOption, BaseOptionConfig> {}

interface BooleanCommandOptionConfig extends BaseOptionConfig, OptionOmit<Discord.ApplicationCommandBooleanOption, BaseOptionConfig> {}
interface UserCommandOptionConfig extends BaseOptionConfig, OptionOmit<Discord.ApplicationCommandUserOption, BaseOptionConfig> {}
interface RoleCommandOptionConfig extends BaseOptionConfig, OptionOmit<Discord.ApplicationCommandRoleOption, BaseOptionConfig> {}
interface MentionableCommandOptionConfig extends BaseOptionConfig, OptionOmit<Discord.ApplicationCommandMentionableOption, BaseOptionConfig> {}
interface AttachmentCommandOptionConfig extends BaseOptionConfig, OptionOmit<Discord.ApplicationCommandAttachmentOption, BaseOptionConfig> {}

export type PrimitiveCommandOptionConfig<CT extends readonly CommandType[], CTX extends AllContexts>
  = StringCommandOptionConfig<CT, CTX>
    | NumericCommandOptionConfig<CT, CTX>
    | BooleanCommandOptionConfig
    | UserCommandOptionConfig
    | ChannelCommandOptionConfig
    | RoleCommandOptionConfig
    | MentionableCommandOptionConfig
    | AttachmentCommandOptionConfig;

export type CommandOptionConfig<
  CT extends readonly CommandType[], CTX extends AllContexts, AO = undefined,
  Options extends OptionsG<CT, CTX, AO> = OptionsG<CT, CTX, AO>
> = StringCommandOptionConfig<CT, CTX>
  | NumericCommandOptionConfig<CT, CTX>
  | BooleanCommandOptionConfig
  | UserCommandOptionConfig
  | ChannelCommandOptionConfig
  | RoleCommandOptionConfig
  | MentionableCommandOptionConfig
  | AttachmentCommandOptionConfig
  | SubcommandConfig<CT, CTX, AO, Options>
  | SubcommandGroupConfig<CT, CTX, AO, Options>;

// #endregion option config

export type RunnableReturns = ['guildOnly']
  | ['paramRequired', { option: string; description: string }]
  | ['invalidChannelType', string]
  | ['strictAutocompleteNoMatch', string]
  | ['strictAutocompleteNoMatchWValues', { option: string; availableOptions: string }];

type PrivateAutocompleteGeneratorOptions<CT extends readonly CommandType[], CTX extends AllContexts> = [
  translator?: Translator<true, Locale>,
  options?: autocompleteOptions<NoInfer<CT>, NoInfer<CTX>>
];

export type PublicAutocompleteGeneratorOptions<CT extends readonly CommandType[], CTX extends AllContexts> = [
  interaction: ExtendsMultiMatch<CommandType, CT, [
    [CommandType.Slash, AutocompleteInteraction<NoInfer<CTX>>],
    [CommandType.Prefix, Message<NoInfer<CTX>>]
  ]>,
  query: string, locale: Locale
];

export type AutocompleteGeneratorOptions<CT extends readonly CommandType[], CTX extends AllContexts> = [
  ...PublicAutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>,
  ...PrivateAutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>
];