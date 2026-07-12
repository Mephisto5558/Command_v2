import type * as Discord from 'discord.js';
import type { MapChannelTypes, autocompleteOption } from './classes/commandOption/utils.ts';
import type { AllContexts, ContextToCaching, ContextToInGuild, ContextType, HasDM, HasGuild } from './index.ts';

export {
  PermissionFlagsBits as Permission,
  ApplicationCommandOptionType as OptionType,
  InteractionContextType as ContextType
} from 'discord.js';

type IsRequired<Options extends readonly unknown[], Name extends string, Type extends Discord.ApplicationCommandOptionType>
  = Not<ExtendsNever<Extract<Options[number], { name: Name; type: Type; required: true }>>>;

type ResolvedValue<
  Options extends readonly unknown[], Name extends string, Type extends Discord.ApplicationCommandOptionType, BaseType
> = IfExtendsNever<GetOption<Options, Name, Type>, {
  ifTrue: BaseType;
  ifFalse: ResolveValue<GetOption<Options, Name, Type>, BaseType>;
}>;

type ResolveValue<Option, BaseType> = Match<[
  [
    Extends<Option, { choices: readonly unknown[] }>,
    ResolveChoiceValue<Extract<Option, { choices: readonly unknown[] }>['choices'][number]>
  ],
  [
    Extends<Option, { strictAutocomplete: true; autocompleteOptions: readonly autocompleteOption[] }>,
    ResolveChoiceValue<
      Extract<Option, { strictAutocomplete: true; autocompleteOptions: readonly autocompleteOption[] }>['autocompleteOptions'][number]
    >
  ]
], BaseType>;

type ResolvedSubcommand<Options extends readonly unknown[]> = IfExtendsNever<
  OptionName<Options, Discord.ApplicationCommandOptionType.Subcommand>,
  { ifTrue: string; ifFalse: OptionName<Options, Discord.ApplicationCommandOptionType.Subcommand> }
>;

type ResolvedSubcommandGroup<Options extends readonly unknown[]> = IfExtendsNever<
  OptionName<Options, Discord.ApplicationCommandOptionType.SubcommandGroup>,
  { ifTrue: string; ifFalse: OptionName<Options, Discord.ApplicationCommandOptionType.SubcommandGroup> }
>;

type ResolveChoiceValue<T> = T extends { value: infer V } ? V : T;
type ResolvedChannel<Options extends readonly unknown[], Name extends string>
  = [GetOption<Options, Name, Discord.ApplicationCommandOptionType.Channel>] extends [never]
    ? ResolvedDefaultChannel
    : GetOption<Options, Name, Discord.ApplicationCommandOptionType.Channel> extends { channelTypes: infer CT extends readonly Discord.ChannelType[] }
      ? [CT[number]] extends [never]
          ? ResolvedDefaultChannel
          : MapChannelTypes<CT>
      : ResolvedDefaultChannel;


type ResolvedDefaultChannel = Discord.GuildBasedChannel | Discord.APIInteractionDataResolvedChannel;

type GetNamesAtLevel<Opts extends readonly unknown[], TargetType extends Discord.ApplicationCommandOptionType>
  = ExtractOptionName<Opts[number], TargetType>;

type OptionName<Options extends readonly unknown[], Type extends Discord.ApplicationCommandOptionType>
  = | ExtractOptionName<Options[number], Type>
    | ExtractOptionName<GetSubOpts<Options[number]>, Type>
    | ExtractOptionName<GetSubOpts<GetSubOpts<Options[number]>>, Type>;

type GetOption<Options extends readonly unknown[], Name extends string, Type extends Discord.ApplicationCommandOptionType>
  = | ExtractGetOption<Options[number], Name, Type>
    | ExtractGetOption<GetSubOpts<Options[number]>, Name, Type>
    | ExtractGetOption<GetSubOpts<GetSubOpts<Options[number]>>, Name, Type>;

type GetSubOpts<O>
  = O extends { options?: infer Sub extends readonly unknown[] }
    ? Sub[number]
    : never;

type ExtractOptionName<O, Type extends Discord.ApplicationCommandOptionType>
  = O extends { name: infer N extends string; type: Type }
    ? N
    : never;

type ExtractGetOption<O, Name extends string, Type extends Discord.ApplicationCommandOptionType>
  = O extends { name: infer ON; type: infer T }
    ? IfExtendsStrict<Type, T, {
      ifTrue: IfExtends<string, ON, {
        ifTrue: O; // Handles JS broad string inference
        ifFalse: IfExtends<ON, Name, { ifTrue: O }>;
      }>;
    }>
    : never;

// Excluding APIInteractionGuildMember because it's an edge case and annoying for now.
type Member<
  CTX extends AllContexts,
  T extends Discord.Message | Discord.ChatInputCommandInteraction
> = If<HasGuild<CTX>, {
  ifTrue: If<HasDM<CTX>, {
    ifTrue: NonNullable<Exclude<T['member'], Discord.APIInteractionGuildMember>> | null;
    ifFalse: NonNullable<Exclude<T['member'], Discord.APIInteractionGuildMember>>;
  }>;
  ifFalse: null;
}>;

// Channel may be null or partial in reality, but with the right Partials and Intents it won't.
type InteractionChannel<
  CTX extends AllContexts,
  T1 extends Discord.Message | Discord.ChatInputCommandInteraction,
  T2 extends Discord.Message | Discord.ChatInputCommandInteraction
> = Exclude<
  NonNullable<If<HasGuild<CTX>, {
    ifTrue: If<HasDM<CTX>, {
      ifTrue: T1['channel'] | T2['channel'];
      ifFalse: T1['channel'];
    }>;
    ifFalse: T2['channel'];
  }>>,
  Discord.PartialDMChannel | Discord.PartialGroupDMChannel
>;

/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  -- extended by the lib user */// @ts-expect-error -- extended by the lib user
export interface CustomChatCommandInputInteractionProps<
  CTX extends AllContexts = AllContexts,
  Options extends readonly unknown[] = []
> {}
/* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */

export type ChatInputCommandInteraction<
  CTX extends AllContexts = AllContexts,
  Options extends readonly unknown[] = []
> = StrictOmit<Discord.ChatInputCommandInteraction<ContextToCaching<CTX>>, 'member' | 'channel' | 'options' | 'inGuild'>
  & CustomChatCommandInputInteractionProps<CTX, Options> & {
    readonly member: Member<CTX, Discord.ChatInputCommandInteraction<ContextToCaching<[Discord.InteractionContextType.Guild]>>>;

    readonly channel: InteractionChannel<
      CTX,
      Discord.ChatInputCommandInteraction<ContextToCaching<[Discord.InteractionContextType.Guild]>>,
      Discord.ChatInputCommandInteraction<ContextToCaching<[Discord.InteractionContextType.BotDM]>>
    >;

    readonly options: TypeSafeOptionResolver<ContextToCaching<CTX>, Options>;

    inGuild(): this is ChatInputCommandInteraction<readonly [ContextType.Guild], Options>;
  };

export type Message<
  CTX extends AllContexts = AllContexts
> = StrictOmit<Discord.Message<ContextToInGuild<CTX>>, 'member' | 'channel' | 'inGuild'> & {
  readonly member: Member<CTX, Discord.Message>;

  readonly channel: InteractionChannel<
    CTX,
    Discord.Message<ContextToInGuild<[Discord.InteractionContextType.Guild]>>,
    Discord.Message<ContextToInGuild<[Discord.InteractionContextType.BotDM]>>
  >;

  inGuild(): this is Message<readonly [ContextType.Guild]> | Discord.Message<ContextToInGuild<readonly [ContextType.Guild]>>;
};

export type AutocompleteInteraction<
  CTX extends AllContexts = AllContexts
> = StrictOmit<Discord.AutocompleteInteraction<ContextToCaching<CTX>>, 'inGuild'> & {
  inGuild(): this is AutocompleteInteraction<readonly [ContextType.Guild]>;
};

export type MessageComponentInteraction<
  CTX extends AllContexts = AllContexts
> = StrictOmit<Discord.MessageComponentInteraction<ContextToCaching<CTX>>, 'inGuild'> & {
  inGuild(): this is MessageComponentInteraction<readonly [ContextType.Guild]>;
};

type DefaultReturnType<T extends Extract<keyof Discord.CommandInteractionOptionResolver, `get${string}${string}`>>
  = NonNullable<ReturnType<Discord.CommandInteractionOptionResolver[T]>>;

export type TypeSafeOptionResolver<
  Cached extends Discord.CacheType = Discord.CacheType,
  Options extends readonly unknown[] = unknown[]
> = LooseOmit<Discord.CommandInteractionOptionResolver<Cached>, `get${string}${string}`> & {
  /* eslint-disable @typescript-eslint/no-unnecessary-type-parameters -- consistency */

  // --- STRING ---
  getString<N extends OptionName<Options, Discord.ApplicationCommandOptionType.String>>(
    name: N, required: true
  ): ResolvedValue<Options, N, Discord.ApplicationCommandOptionType.String, DefaultReturnType<'getString'>>;
  getString<N extends OptionName<Options, Discord.ApplicationCommandOptionType.String>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, Discord.ApplicationCommandOptionType.String, DefaultReturnType<'getString'>>
    | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.String>, false, { ifTrue: null }>;
  getString(name: string, required: true): DefaultReturnType<'getString'>;
  getString(name: string, required?: boolean): DefaultReturnType<'getString'> | null;

  // --- INTEGER ---
  getInteger<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Integer>>(
    name: N, required: true
  ): ResolvedValue<Options, N, Discord.ApplicationCommandOptionType.Integer, DefaultReturnType<'getInteger'>>;
  getInteger<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Integer>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, Discord.ApplicationCommandOptionType.Integer, DefaultReturnType<'getInteger'>>
    | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.Integer>, false, { ifTrue: null }>;
  getInteger(name: string, required: true): DefaultReturnType<'getInteger'>;
  getInteger(name: string, required?: boolean): DefaultReturnType<'getInteger'> | null;

  // --- NUMBER ---
  getNumber<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Number>>(
    name: N, required: true
  ): ResolvedValue<Options, N, Discord.ApplicationCommandOptionType.Number, DefaultReturnType<'getNumber'>>;
  getNumber<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Number>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, Discord.ApplicationCommandOptionType.Number, DefaultReturnType<'getNumber'>>
    | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.Number>, false, { ifTrue: null }>;
  getNumber(name: string, required: true): DefaultReturnType<'getNumber'>;
  getNumber(name: string, required?: boolean): DefaultReturnType<'getNumber'> | null;

  // --- BOOLEAN ---
  getBoolean<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Boolean>>(
    name: N, required: true
  ): DefaultReturnType<'getBoolean'>;
  getBoolean<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Boolean>>(
    name: N, required?: boolean
  ): DefaultReturnType<'getBoolean'> | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.Boolean>, false, { ifTrue: null }>;
  getBoolean(name: string, required: true): DefaultReturnType<'getBoolean'>;
  getBoolean(name: string, required?: boolean): DefaultReturnType<'getBoolean'> | null;

  // --- USER / MEMBER ---
  getUser<N extends OptionName<Options, Discord.ApplicationCommandOptionType.User>>(
    name: N, required: true
  ): DefaultReturnType<'getUser'>;
  getUser<N extends OptionName<Options, Discord.ApplicationCommandOptionType.User>>(
    name: N, required?: boolean
  ): DefaultReturnType<'getUser'> | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.User>, false, { ifTrue: null }>;
  getUser(name: string, required: true): DefaultReturnType<'getUser'>;
  getUser(name: string, required?: boolean): DefaultReturnType<'getUser'> | null;

  getMember(name: OptionName<Options, Discord.ApplicationCommandOptionType.User> | string): DefaultReturnType<'getMember'> | null;

  // --- CHANNEL ---
  getChannel<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Channel>>(
    name: N, required: true, channelTypes?: readonly Discord.ChannelType[]
  ): ResolvedChannel<Options, N>;
  getChannel<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Channel>>(
    name: N, required?: boolean, channelTypes?: readonly Discord.ChannelType[]
  ): ResolvedChannel<Options, N> | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.Channel>, true, { ifFalse: null }>;
  getChannel(name: string, required: true, channelTypes?: readonly Discord.ChannelType[]): DefaultReturnType<'getChannel'>;
  getChannel(name: string, required?: boolean, channelTypes?: readonly Discord.ChannelType[]): DefaultReturnType<'getChannel'> | null;

  // --- ROLE ---
  getRole<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Role>>(
    name: N, required: true
  ): DefaultReturnType<'getRole'>;
  getRole<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Role>>(
    name: N, required?: boolean
  ): DefaultReturnType<'getRole'> | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.Role>, true, { ifFalse: null }>;
  getRole(name: string, required: true): DefaultReturnType<'getRole'>;
  getRole(name: string, required?: boolean): DefaultReturnType<'getRole'> | null;

  // --- ATTACHMENT ---
  getAttachment<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Attachment>>(
    name: N, required: true
  ): DefaultReturnType<'getAttachment'>;
  getAttachment<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Attachment>>(
    name: N, required?: boolean
  ): DefaultReturnType<'getAttachment'>
    | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.Attachment>, true, { ifFalse: null }>;
  getAttachment(name: string, required: true): DefaultReturnType<'getAttachment'>;
  getAttachment(name: string, required?: boolean): DefaultReturnType<'getAttachment'> | null;

  // --- MENTIONABLE ---
  getMentionable<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Mentionable>>(
    name: N, required: true
  ): DefaultReturnType<'getMentionable'>;
  getMentionable<N extends OptionName<Options, Discord.ApplicationCommandOptionType.Mentionable>>(
    name: N, required?: boolean
  ): DefaultReturnType<'getMentionable'>
    | IfExtendsStrict<IsRequired<Options, N, Discord.ApplicationCommandOptionType.Mentionable>, true, { ifFalse: null }>;
  getMentionable(name: string, required: true): DefaultReturnType<'getMentionable'>;
  getMentionable(name: string, required?: boolean): DefaultReturnType<'getMentionable'> | null;

  // --- SUBCOMMANDS ---
  getSubcommand(required?: true): ResolvedSubcommand<Options>;
  getSubcommand(required: boolean): ResolvedSubcommand<Options> | null;

  getSubcommandGroup(required?: true): ResolvedSubcommandGroup<Options>;
  getSubcommandGroup(required: boolean): ResolvedSubcommandGroup<Options> | null;

  readonly subcommand: {
    [K in GetNamesAtLevel<Options, Discord.ApplicationCommandOptionType.Subcommand>]: TypeSafeOptionResolver<Cached,
      [Extract<Options[number], { name: K }>] extends [{ options: infer O extends readonly unknown[] }] ? O : []
    >
  };

  /* eslint-enable @typescript-eslint/no-unnecessary-type-parameters */
};