import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import { PrismaService } from './database/prisma/prisma.service';

export class AppVersionResponse {
  @ApiProperty({
    type: 'string',
    example: '0.0.0',
    description: '시맨틱 버전 스펙을 따릅니다',
  })
  version: string;

  @ApiProperty()
  createdAt: Date;
}

@ApiTags('/')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('health-check')
  healthCheck() {
    return 'OK';
  }

  @ApiOperation({ summary: '앱용 버전 확인' })
  @Get('app-version')
  @ApiResponse({ status: 200, type: AppVersionResponse })
  async getAppversion(): Promise<AppVersionResponse> {
    const appVersion = await this.prisma.appVersion.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (!appVersion)
      return {
        version: '0.0.0',
        createdAt: new Date(),
      };
    return appVersion;
  }
}
