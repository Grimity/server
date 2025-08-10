import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationReader } from './repository/notification.reader';
import { NotificationWriter } from './repository/notification.writer';
import { NotificationListener } from './notification.listener';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationReader,
    NotificationWriter,
    NotificationListener,
  ],
})
export class NotificationModule {}
