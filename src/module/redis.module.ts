import { Module, Global } from '@nestjs/common';
import { RedisService } from 'src/provider/redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
