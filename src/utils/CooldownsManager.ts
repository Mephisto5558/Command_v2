/* eslint-disable unicorn/filename-case -- class export */

import { isMessage } from '../classes/utils.ts';
import { CooldownType } from '../index.ts';

import type { CommandType } from '../classes/utils.ts';
import type { AllContexts, CommandInitialized as Command, CommandInteraction } from '../index.ts';

export class CooldownsManager {
  cache = new Map<string, Map<CooldownType, Map<Snowflake, number>>>();

  /** @returns milliseconds until the cooldown ends */
  update(
    name: string, context: CommandInteraction,
    cooldowns: Partial<Command<CommandType[], AllContexts>['cooldowns']>
  ): number {
    const
      /* eslint-disable-next-line unicorn/prefer-temporal -- not my choice here */
      createdAt = context.createdAt.getTime(),
      timeStamps = this.cache.getOrInsertComputed(name, () => new Map()),
      currentCooldowns = [];

    for (const [cdName, value] of Object.entries(cooldowns)) {
      if (!value) continue;

      let areaId: Snowflake | undefined;
      switch (cdName) {
        case CooldownType.User:
          areaId = (isMessage(context) ? context.author : context.user).id;
          break;
        case CooldownType.Guild:
          areaId = context.guildId ?? undefined;
          break;
        case CooldownType.Channel:
          areaId = context.channelId;
          break;
      }

      if (!areaId) continue;

      const
        typeCache = timeStamps.getOrInsertComputed(cdName, () => new Map()),
        timestamp = typeCache.get(areaId) ?? 0;

      if (timestamp > createdAt) currentCooldowns.push(timestamp - createdAt);
      else {
        typeCache.set(areaId, createdAt + value);

        setTimeout(() => {
          typeCache.delete(areaId);
          if (!typeCache.size) timeStamps.delete(cdName);
        }, value);
      }
    }

    return Math.max(0, ...currentCooldowns);
  }
}