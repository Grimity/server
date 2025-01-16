import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { NotificationService } from 'src/provider/notification.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { NotificationDto } from './dto/notification';

@ApiBearerAuth()
@ApiTags('/notifications')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiResponse({ status: 200, type: NotificationDto, isArray: true })
  @Get()
  @UseGuards(JwtGuard)
  async getAll(@CurrentUser() userId: string): Promise<NotificationDto[]> {
    return await this.notificationService.getAll(userId);
  }
}
