import {
  Controller,
  Get,
  UseGuards,
  Put,
  Param,
  HttpCode,
} from '@nestjs/common';
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
  @ApiResponse({
    status: 200,
    type: NotificationDto,
    isArray: true,
    description: '성공',
  })
  @Get()
  @UseGuards(JwtGuard)
  async getAll(@CurrentUser() userId: string): Promise<NotificationDto[]> {
    return await this.notificationService.getAll(userId);
  }

  @ApiOperation({ summary: '알림 읽음 처리' })
  @UseGuards(JwtGuard)
  @Put(':id')
  @HttpCode(204)
  async read(
    @CurrentUser() userId: string,
    @Param('id') notificationId: string,
  ) {
    await this.notificationService.read(userId, notificationId);
    return;
  }
}
