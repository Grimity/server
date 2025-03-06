import { Module } from '@nestjs/common';
import { RedisService } from 'src/database/redis/redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
