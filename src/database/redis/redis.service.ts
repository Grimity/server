import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redis: Redis;
  private subRedis: Redis;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
    });
    this.subRedis = this.redis.duplicate();

    this.subRedis.on('message', (channel: string, message: string) => {
      console.log(`Received message from channel ${channel}: ${message}`);
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

  async publish(channel: string, message: string) {
    await this.redis.publish(channel, message);
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
