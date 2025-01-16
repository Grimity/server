import { Controller, Get, UseGuards } from '@nestjs/common';
import { NotificationService } from 'src/provider/notification.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getAll(@CurrentUser() userId: string) {
    return await this.notificationService.getAll(userId);
  }
}
