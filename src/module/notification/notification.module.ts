import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repository/notification.repository';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationRepository],
})
export class NotificationModule {}
