import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationReader } from './repository/notification.reader';
import { NotificationWriter } from './repository/notification.writer';
import { NotificationListener } from './notification.listener';
import { WsModule } from '../websocket/ws.module';

@Module({
  imports: [WsModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationReader,
    NotificationWriter,
    NotificationListener,
  ],
})
export class NotificationModule {}
