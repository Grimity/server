import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/core/guard';
import { IdResponse } from 'src/shared/response/id.response';
import { AdminNoticeService } from './admin-notice.service';
import {
  CreateAdminNoticeRequest,
  UpdateAdminNoticeRequest,
} from './dto/admin-notice.request';

@ApiExcludeController()
@ApiTags('/admin')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: '어드민 인증 실패' })
@Controller('admin/notices')
export class AdminNoticeController {
  constructor(private readonly adminNoticeService: AdminNoticeService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: '어드민 - 공지사항 생성 (authorId = OFFICIAL_USER_ID, type=NOTICE)',
  })
  @ApiResponse({ status: 201, type: IdResponse })
  @ApiResponse({
    status: 500,
    description: 'OFFICIAL_USER_ID 환경변수 미설정',
  })
  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() dto: CreateAdminNoticeRequest): Promise<IdResponse> {
    return await this.adminNoticeService.create(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 공지사항 수정' })
  @ApiResponse({ status: 204, description: '공지사항 수정 성공' })
  @ApiResponse({ status: 404, description: '공지사항이 없음' })
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) noticeId: string,
    @Body() dto: UpdateAdminNoticeRequest,
  ) {
    await this.adminNoticeService.update(noticeId, dto);
    return;
  }
}
