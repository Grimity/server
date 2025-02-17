import { Module, Global } from '@nestjs/common';
import { RedisService } from 'src/database/redis/redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
