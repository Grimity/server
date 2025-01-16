import { Module } from '@nestjs/common';
import { NotificationController } from 'src/controller/notification.controller';
import { NotificationService } from 'src/provider/notification.service';
import { NotificationRepository } from 'src/repository/notification.repository';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationRepository],
})
export class NotificationModule {}
