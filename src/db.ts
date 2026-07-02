import type * as Discord from 'discord.js';
import type { CommandType } from './classes/utils.ts';
import type { CommandInitialized as Command } from './index.ts';

export type Database = {
  botSettings: {
    cmdStats: Record<Command['name'], {
      createdAt: Temporal.Instant;
    } & Partial<Record<CommandType, number>>>;
  };
  guildSettings: Record<Discord.Guild['id'], {
    config: {
      commands?: Record<Command['name'], {
        disabled?: {
          users: (Discord.User['id'] | '*')[];
          channels: (Discord.Channel['id'] | '*')[];
          roles: (Discord.Role['id'] | '*')[];
        };
      }>;
    };
  }>;
};