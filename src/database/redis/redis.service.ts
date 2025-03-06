import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redis: Redis;
  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
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
