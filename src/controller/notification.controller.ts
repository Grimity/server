import { Controller } from '@nestjs/common';
import { NotificationService } from 'src/provider/notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}
}
