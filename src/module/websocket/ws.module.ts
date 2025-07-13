import { Module } from '@nestjs/common';
import { GlobalGateway } from './global.gateway';
import { RedisModule } from 'src/database/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [GlobalGateway],
})
export class WsModule {}
