import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PushService } from './push.service';

export class PushNotificationRequest {
  @IsString()
  @ApiProperty({ description: '푸시 알림 제목' })
  title: string;

  @IsString()
  @ApiProperty({ description: '푸시 알림 메시지' })
  message: string;

  @IsString()
  @ApiProperty({ description: '푸시 알림 수신자 토큰' })
  token: string;
}

@ApiTags('/push')
@Controller('push')
export class PushController {
  constructor(private readonly PushService: PushService) {}
  @Post('/send')
  @ApiOperation({ summary: '푸시 알림 전송' })
  async sendPushNotification(@Body() dto: PushNotificationRequest) {
    await this.PushService.sendTestPushNotification(dto);
    return;
  }
}
