import { Module, Global } from '@nestjs/common';
import { RedisService } from 'src/database/redis/redis.service';
import { TypedRedisPublisher } from './typed-redis-publisher';

@Global()
@Module({
  providers: [RedisService, TypedRedisPublisher],
  exports: [RedisService, TypedRedisPublisher],
})
export class RedisModule {}
