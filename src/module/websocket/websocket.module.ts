import { Module } from '@nestjs/common';
import { GlobalGateway } from './global.gateway';
import { RedisModule } from 'src/database/redis/redis.module';
import { WebsocketController } from './websocket.controller';

@Module({
  imports: [RedisModule],
  controllers: [WebsocketController],
  providers: [GlobalGateway],
  exports: [GlobalGateway],
})
export class WebsocketModule {}
