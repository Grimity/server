import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisEventName, RedisEventPayloadMap } from './redis-event.types';

@Injectable()
export class TypedRedisPublisher {
  constructor(private readonly redisService: RedisService) {}

  async publish<K extends RedisEventName>(
    channel: string,
    event: K,
    payload: RedisEventPayloadMap[K],
  ) {
    await this.redisService.publish(channel, { event, ...payload });
  }
}
