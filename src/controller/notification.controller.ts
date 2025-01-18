import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { NotificationService } from 'src/provider/notification.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { NotificationDto } from './dto/notification';

@ApiTags('/notifications')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '알림 목록 조회 성공',
    type: NotificationDto,
    isArray: true,
  })
  @UseGuards(JwtGuard)
  @Get()
  async getAll(@CurrentUser() userId: string): Promise<NotificationDto[]> {
    return this.notificationService.getAll(userId);
  }
}
