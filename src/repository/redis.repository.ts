import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisRepository {
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
    });
  }

  async setPopularTags(items: { tagName: string; thumbnail: string }[]) {
    // 30분 동안 유지
    await this.redis.set('popularTags', JSON.stringify(items), 'EX', 60 * 30);
  }

  async getPopularTags() {
    const result = await this.redis.get('popularTags');
    if (result === null) return null;
    return JSON.parse(result) as { tagName: string; thumbnail: string }[];
  }

  async deleteAll() {
    await this.redis.flushall();
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
