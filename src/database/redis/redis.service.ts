import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import { RedisEventName, RedisEventPayloadMap } from './redis-event.types';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redis: Redis;
  private subRedis: Redis;

  constructor(
    private configService: ConfigService,
    private eventEmitter: TypedEventEmitter,
  ) {
    const redisPassword = this.configService.get('REDIS_PASSWORD');
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: Number(this.configService.get('REDIS_PORT')) || 6379,
      ...(redisPassword && {
        password: redisPassword,
      }),
    });
    this.subRedis = this.redis.duplicate();

    this.subRedis.on('message', (channel: string, message: string) => {
      const { event, ...payload } = JSON.parse(message) as {
        event: RedisEventName;
      } & RedisEventPayloadMap[RedisEventName];

      this.eventEmitter.emit(event, {
        ...payload,
        targetUserId: channel.split(':')[1],
      } as never);
    });
  }

  get pubClient() {
    return this.redis;
  }

  get subClient() {
    return this.subRedis;
  }

  async subscribe(channel: string) {
    await this.subRedis.subscribe(channel);
  }

  async unSubscribe(channel: string) {
    await this.subRedis.unsubscribe(channel);
  }

  async isSubscribed(channel: string) {
    try {
      const channels = await this.pubClient.pubsub('CHANNELS', channel);
      return channels.length > 0;
    } catch (e) {
      return false;
    }
  }

  async publish(channel: string, message: any) {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async onModuleDestroy() {
    await this.redis.quit();
    await this.subRedis.quit();
  }

  async cacheArray(key: string, arr: any[], second: number) {
    await this.redis.set(key, JSON.stringify(arr), 'EX', second);
    return;
  }

  async getArray(key: string) {
    const result = await this.redis.get(key);
    if (result === null) return null;
    return JSON.parse(result) as any[];
  }

  async flushall() {
    await this.redis.flushall();
  }
}
