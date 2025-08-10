import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repository/notification.repository';
import { NotificationListener } from './notification.listener';
import { WsModule } from '../websocket/ws.module';

@Module({
  imports: [WsModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationListener,
  ],
  exports: [NotificationRepository],
})
export class NotificationModule {}
