import { Controller, Get, UseGuards, Put, HttpCode } from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationService } from 'src/provider/notification.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { NotificationDto } from './dto/notification';

@ApiBearerAuth()
@ApiTags('/notifications')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @ApiOperation({ summary: '알림 목록 조회' })
  @ApiResponse({
    status: 200,
    type: NotificationDto,
    isArray: true,
    description: '성공',
  })
  @Get()
  async getAll(@CurrentUser() userId: string): Promise<NotificationDto[]> {
    return this.notificationService.getAll(userId);
  }

  @ApiOperation({ summary: '전체 알림 읽음 처리' })
  @ApiResponse({ status: 204, description: '성공' })
  @HttpCode(204)
  @Put()
  async read(@CurrentUser() userId: string) {
    await this.notificationService.readAll(userId);
  }
}
