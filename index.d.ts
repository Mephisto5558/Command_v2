/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  APIInteractionDataResolvedChannel, APIRole, ApplicationCommand, ApplicationCommandOption, ApplicationCommandOptionChoiceData,
  ApplicationCommandOptionType, ApplicationCommandType, Attachment, AutocompleteInteraction, CategoryChannel, ChannelType,
  ChatInputCommandInteraction, ClientApplication, CommandInteractionOptionResolver, GuildBasedChannel, GuildMember, Message, NewsChannel,
  PermissionFlags, PermissionsBitField, Role, StageChannel, TextChannel, ThreadChannel, User, VoiceChannel, _NonNullableFields
} from 'discord.js';
import type * as __ from '@mephisto5558/better-types'; /* eslint-disable-line import-x/no-namespace -- load in global definitions */
import type { I18nProvider, Locale, Translator } from '@mephisto5558/i18n';

export * from './utils/index.js';
export * as loaders from './loaders';
export { PermissionFlagsBits as Permissions } from 'discord.js';

type ResolveContext<MAP, KEYS extends (keyof MAP)[]> = MAP[KEYS[number]];

type autocompleteObject = StrictOmit<ApplicationCommandOptionChoiceData, 'nameLocalizations'>;
type autocompleteOptions = autocompleteObject['value'] | autocompleteObject;
export type CommandType = 'slash' | 'prefix';

export type commandDoneFn<cmd extends Command = Command<CommandType[], boolean>> = (
  this: ThisParameterType<cmd['run']>,
  command: cmd, lang: Translator
) => Promise<never>;

export declare const commandTypes: { readonly [K in CommandType]: K };

type DefaultOptionType<CT extends readonly CommandType[], DM extends boolean>
  = CommandOptionConfig<CT, DM, never, readonly unknown[]> | CommandOption<CT, DM, never, readonly unknown[]>;

type StrictCommand<
  CT extends readonly CommandType[], DM extends boolean,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> = Command<NoInfer<CT>, NoInfer<DM>, NoInfer<Options>>;
type StrictCommandOption<
  CT extends readonly CommandType[], DM extends boolean, AO = never,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> = CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>>;

type OptionName<Options extends readonly unknown[], Type extends keyof typeof ApplicationCommandOptionType>
  = Options[number] extends infer O
    ? O extends { type: Type; name: infer N } ? (N extends string ? N : never)
    : O extends { type: 'Subcommand' | 'SubcommandGroup'; options: infer SubOptions }
      ? (SubOptions extends readonly unknown[] ? OptionName<SubOptions, Type> : never)
      : never
    : never;

type GetOption<Options extends readonly unknown[], Name extends string, Type extends keyof typeof ApplicationCommandOptionType>
  = Options[number] extends infer O
    ? O extends { name: Name; type: Type } ? O
    : O extends { type: 'Subcommand' | 'SubcommandGroup'; options: infer SubOptions }
      ? (SubOptions extends readonly unknown[] ? GetOption<SubOptions, Name, Type> : never)
      : never
    : never;

type ResolvedChannelType<T extends ChannelType>
  = T extends ChannelType.GuildText ? TextChannel
  : T extends ChannelType.GuildVoice ? VoiceChannel
  : T extends ChannelType.GuildCategory ? CategoryChannel
  : T extends ChannelType.GuildAnnouncement ? NewsChannel
  : T extends ChannelType.GuildStageVoice ? StageChannel
  : T extends ChannelType.PublicThread | ChannelType.PrivateThread | ChannelType.AnnouncementThread ? ThreadChannel
  : GuildBasedChannel;

type MapChannelTypes<Types extends readonly ChannelType[]> = ResolvedChannelType<Types[number]>;

type ResolvedChannel<Options extends readonly unknown[], Name extends string>
  = GetOption<Options, Name, 'Channel'> extends { channelTypes: readonly ChannelType[] }
    ? MapChannelTypes<GetOption<Options, Name, 'Channel'>['channelTypes']>
    : GuildBasedChannel | APIInteractionDataResolvedChannel;

type ResolvedSubcommand<Options extends readonly unknown[]>
  = OptionName<Options, 'Subcommand'> extends never ? string : OptionName<Options, 'Subcommand'>;

type ResolvedSubcommandGroup<Options extends readonly unknown[]>
  = OptionName<Options, 'SubcommandGroup'> extends never ? string : OptionName<Options, 'SubcommandGroup'>;

type ResolveValue<Option, BaseType>
  = Option extends { choices: readonly (infer C)[] } ? (C extends { value: infer V } ? V : C)
  : BaseType;

type ResolvedValue<Options extends readonly unknown[], Name extends string, Type extends keyof typeof ApplicationCommandOptionType, BaseType>
  = ResolveValue<GetOption<Options, Name, Type>, BaseType>;

type TypeSafeOptionResolver<Options extends readonly unknown[]> = StrictOmit<
  /* eslint-disable-next-line sonarjs/max-union-size */
  CommandInteractionOptionResolver, 'getString' | 'getInteger' | 'getNumber' | 'getBoolean' | 'getUser'
  | 'getMember' | 'getChannel' | 'getRole' | 'getAttachment' | 'getMentionable' | 'getSubcommand' | 'getSubcommandGroup'
> & {
  /* eslint-disable @typescript-eslint/unified-signatures -- unifying them would result in lost accuracy */
  getString<N extends OptionName<Options, 'String'>>(name: N, required: true): ResolvedValue<Options, N, 'String', string>;
  getString<N extends OptionName<Options, 'String'>>(name: N, required?: boolean): ResolvedValue<Options, N, 'String', string>
    | (GetOption<Options, N, 'String'> extends { required: true } ? never : null);
  getString(name: string, required: true): string;
  getString(name: string, required?: boolean): string | null;

  getInteger<N extends OptionName<Options, 'Integer'>>(name: N, required: true): ResolvedValue<Options, N, 'Integer', number>;
  getInteger<N extends OptionName<Options, 'Integer'>>(name: N, required?: boolean): ResolvedValue<Options, N, 'Integer', number>
    | (GetOption<Options, N, 'Integer'> extends { required: true } ? never : null);
  getInteger(name: string, required: true): number;
  getInteger(name: string, required?: boolean): number | null;

  getNumber<N extends OptionName<Options, 'Number'>>(name: N, required: true): ResolvedValue<Options, N, 'Number', number>;
  getNumber<N extends OptionName<Options, 'Number'>>(name: N, required?: boolean): ResolvedValue<Options, N, 'Number', number>
    | (GetOption<Options, N, 'Number'> extends { required: true } ? never : null);
  getNumber(name: string, required: true): number;
  getNumber(name: string, required?: boolean): number | null;

  getBoolean(name: OptionName<Options, 'Boolean'>, required: true): boolean;
  getBoolean<N extends OptionName<Options, 'Boolean'>>(name: N, required?: boolean): GetOption<Options, N, 'Boolean'> extends { required: true }
    ? boolean : boolean | null;
  getBoolean(name: string, required: true): boolean;
  getBoolean(name: string, required?: boolean): boolean | null;

  getUser(name: OptionName<Options, 'User'>, required: true): User;
  getUser<N extends OptionName<Options, 'User'>>(name: N, required?: boolean): GetOption<Options, N, 'User'> extends { required: true }
    ? User : User | null;
  getUser(name: string, required: true): User;
  getUser(name: string, required?: boolean): User | null;

  getMember(name: OptionName<Options, 'User'>): GuildMember | null;
  getMember(name: string): GuildMember | null;

  getChannel<N extends OptionName<Options, 'Channel'>>(name: N, required: true, channelTypes?: readonly ChannelType[]):
  ResolvedChannel<Options, N>;
  getChannel<N extends OptionName<Options, 'Channel'>>(name: N, required: false, channelTypes?: readonly ChannelType[]):
    ResolvedChannel<Options, N>
    | (GetOption<Options, N, 'Channel'> extends { required: true } ? never : null);
  getChannel<N extends OptionName<Options, 'Channel'>>(name: N, required?: boolean, channelTypes?: readonly ChannelType[]):
    ResolvedChannel<Options, N>
    | (GetOption<Options, N, 'Channel'> extends { required: true } ? never : null);
  getChannel(name: string, required: true, channelTypes?: readonly ChannelType[]): GuildBasedChannel | APIInteractionDataResolvedChannel;
  getChannel(name: string, required: false, channelTypes?: readonly ChannelType[]): GuildBasedChannel | APIInteractionDataResolvedChannel | null;
  getChannel(name: string, required?: boolean, channelTypes?: readonly ChannelType[]): GuildBasedChannel | APIInteractionDataResolvedChannel | null;

  getRole(name: OptionName<Options, 'Role'>, required: true): Role | APIRole;
  getRole<N extends OptionName<Options, 'Role'>>(name: N, required?: boolean): GetOption<Options, N, 'Role'> extends { required: true }
    ? Role | APIRole : Role | APIRole | null;
  getRole(name: string, required: true): Role | APIRole;
  getRole(name: string, required?: boolean): Role | APIRole | null;

  getAttachment(name: OptionName<Options, 'Attachment'>, required: true): Attachment;
  getAttachment<N extends OptionName<Options, 'Attachment'>>(
    name: N, required?: boolean
  ): GetOption<Options, N, 'Attachment'> extends { required: true } ? Attachment : Attachment | null;
  getAttachment(name: string, required: true): Attachment;
  getAttachment(name: string, required?: boolean): Attachment | null;

  getMentionable(name: OptionName<Options, 'Mentionable'>, required: true): User | GuildMember | Role | APIRole;
  getMentionable<N extends OptionName<Options, 'Mentionable'>>(
    name: N, required?: boolean
  ): GetOption<Options, N, 'Mentionable'> extends { required: true }
    ? User | GuildMember | Role | APIRole : User | GuildMember | Role | APIRole | null;
  getMentionable(name: string, required: true): User | GuildMember | Role | APIRole;
  getMentionable(name: string, required?: boolean): User | GuildMember | Role | APIRole | null;

  getSubcommand(required?: true): ResolvedSubcommand<Options>;
  getSubcommand(required: boolean): ResolvedSubcommand<Options> | null;

  getSubcommandGroup(required?: true): ResolvedSubcommandGroup<Options>;
  getSubcommandGroup(required: boolean): ResolvedSubcommandGroup<Options> | null;
  /* eslint-enable @typescript-eslint/unified-signatures */
};

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export interface CommandConfig<
  CT extends readonly CommandType[], DM extends boolean,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> {
  types: CT;
  usage?: { usage?: string; examples?: string } & {};
  aliases?: { [K in NoInfer<CT>[number]]?: string[] } & {};
  cooldowns?: { guild?: number; channel?: number; user?: number } & {};
  permissions?: { client?: PermissionFlags[keyof PermissionFlags][]; user?: PermissionFlags[keyof PermissionFlags][] } & {};
  dmPermission?: DM;

  disabled?: boolean;
  disabledReason?: string;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  options?: Options;

  beta?: true;

  run: StrictCommand<CT, DM, Options>['run'];
}

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export interface CommandOptionConfig<
  CT extends readonly CommandType[], DM extends boolean, AO = never,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> {
  name: string;
  type: keyof typeof ApplicationCommandOptionType;
  required?: boolean;
  cooldowns?: { guild?: number; channel?: number; user?: number } & {};
  dmPermission?: DM;

  disabled?: boolean;
  disabledReason?: string;

  strictAutocomplete?: boolean;
  autocompleteOptions?: StrictCommandOption<CT, DM, AO>['autocompleteOptions'];

  choices?: ApplicationCommandOptionChoiceData['value'][];

  channelTypes?: ChannelType[];

  minValue?: number;
  maxValue?: number;

  minLength?: number;
  maxLength?: number;

  options?: Options;

  run?: StrictCommandOption<CT, DM, AO, Options>['run'];
}

export declare class CommandExecutionError extends Error {
  name: 'CommandExecutionError';

  interaction: ThisParameterType<Command<CommandType[], boolean>['run']>;
  translator: Translator<boolean, Locale>;

  constructor(
    message: CommandExecutionError['message'], interaction: CommandExecutionError['interaction'],
    translator: CommandExecutionError['translator'], options?: ErrorOptions
  );
}

export declare class Command<
  const commandTypes extends readonly CommandType[] = [],
  const runsInDM extends boolean = false,
  const Options extends readonly (
    CommandOptionConfig<commandTypes, runsInDM> | StrictCommandOption<commandTypes, runsInDM>
  )[] = readonly DefaultOptionType<commandTypes, runsInDM>[]
> {
  name: Lowercase<string>;
  id: `commands.${Command['category']}.${Command['name']}`;
  commandId: ['slash'] extends NoInfer<commandTypes> ? Snowflake : undefined;

  /** Currently not used */
  nameLocalizations?: Record<Locale, Lowercase<string>>;

  description: string;
  descriptionLocalizations: Record<Locale, string>;

  category: Lowercase<string>;

  type: ApplicationCommandType;
  types: commandTypes;

  usage: { [K in 'usage' | 'examples']: string | undefined } & {};
  usageLocalizations: Record<Locale, StrictCommand<commandTypes, runsInDM>['usage']>;

  aliases: { [K in NoInfer<commandTypes>[number]]: string[] } & {};
  cooldowns: { [K in 'guild' | 'channel' | 'user']: number } & {};

  permissions: { [K in 'client' | 'user']: PermissionFlags[keyof PermissionFlags][] } & {};
  get defaultMemberPermissions(): PermissionsBitField;

  dmPermission: runsInDM;

  disabled: boolean;
  disabledReason: string | undefined;

  noDefer: boolean;
  ephemeralDefer: boolean;

  options: StrictCommandOption<commandTypes, runsInDM>[];

  beta?: boolean;

  run: (
    this: ResolveContext<{
      slash: StrictOmit<ChatInputCommandInteraction<runsInDM extends false ? true : false>, 'options'> & { options: TypeSafeOptionResolver<Options> };
      prefix: Message<runsInDM extends false ? true : false>;
    }, NoInfer<commandTypes>>,
    lang: Translator, client: Client
  ) => Promise<never>;

  constructor(config: CommandConfig<commandTypes, runsInDM, Options>);

  init(i18n: I18nProvider, filePath: string, logger: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  }, doneFn?: commandDoneFn<StrictCommand<commandTypes, runsInDM>>): this;

  async runWrapper(Interaction: ThisParameterType<StrictCommand<commandTypes, runsInDM>['run']>, i18n: I18nProvider, locale: Locale): Promise<never>;

  reload(
    application: ResolveContext<{
      slash: ClientApplication;
      prefix: ClientApplication | undefined;
    }, NoInfer<commandTypes>>,
    i18n?: I18nProvider
  ): Promise<Command<CommandType[], boolean>>;

  reloadApplicationCommand(application: ClientApplication, newCommand: Command<CommandType[], boolean>): Promise<ApplicationCommand | undefined>;

  findOption(
    option: { name: string; type?: ApplicationCommandOptionType },
    interaction?: ThisParameterType<StrictCommand<[typeof commandTypes.slash], runsInDM>['run']>
  ): StrictCommandOption<commandTypes, runsInDM> | undefined;

  isEqualTo(cmd?: Command<CommandType[], boolean> | ApplicationCommand): boolean;
}

export declare class CommandOption<
  const commandTypes extends readonly CommandType[] = [],
  const runsInDM extends boolean = false,
  const additionalRunOpts = never,
  const Options extends readonly (
    CommandOptionConfig<commandTypes, runsInDM> | StrictCommandOption<commandTypes, runsInDM>
  )[] = readonly DefaultOptionType<commandTypes, runsInDM>[]
> {
  name: Lowercase<string>;
  id: `${string}.options.${CommandOption['name']}`;

  /** Currently not used */
  nameLocalizations?: Record<Locale, Lowercase<string>>;
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
      ) => autocompleteOptions[] | Promise<autocompleteOptions[]>
    ) | undefined;

  choices: ApplicationCommandOptionChoiceData[] | undefined;

  channelTypes: ChannelType[] | undefined;

  minValue?: number;
  maxValue?: number;

  minLength?: number;
  maxLength?: number;

  options: StrictCommandOption<commandTypes, runsInDM>[];

  run: (
    this: ThisParameterType<StrictCommand<commandTypes, runsInDM, Options>['run']>,
    lang: Translator, options: additionalRunOpts, client: Client
  ) => Promise<never>;

  constructor(config: CommandOptionConfig<commandTypes, runsInDM, additionalRunOpts, Options>);

  init(i18n: I18nProvider, parentId: Command['id'] | CommandOption['id'], logger: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  }): this;

  /** `translator` and `options` should not be supplied by an external caller. */
  generateAutocomplete(
    interaction: AutocompleteInteraction | Message,
    query: string, locale: Locale, translator?: Translator<true>,
    options?: StrictCommandOption<commandTypes, runsInDM>['autocompleteOptions']
  ): Promise<[] | autocompleteObject[]>;

  isEqualTo(opt: CommandOption<CommandType[], boolean> | ApplicationCommandOption): boolean;
}