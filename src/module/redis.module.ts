import { Module } from '@nestjs/common';
import { RedisRepository } from 'src/repository/redis.repository';

@Module({
  providers: [RedisRepository],
  exports: [RedisRepository],
})
export class RedisModule {}
