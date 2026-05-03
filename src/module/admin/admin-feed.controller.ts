import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/core/guard';
import { AdminFeedService } from './admin-feed.service';
import { AdminGetFeedsRequest } from './dto/admin-feed.request';
import {
  AdminFeedDetailResponse,
  AdminLatestFeedsResponse,
} from './dto/admin-feed.response';

@ApiTags('/admin')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: '어드민 인증 실패' })
@Controller('admin/feeds')
export class AdminFeedController {
  constructor(private readonly adminFeedService: AdminFeedService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 피드 목록 최신순 조회' })
  @ApiResponse({ status: 200, type: AdminLatestFeedsResponse })
  @UseGuards(AdminGuard)
  @Get()
  async getFeeds(
    @Query() query: AdminGetFeedsRequest,
  ): Promise<AdminLatestFeedsResponse> {
    return await this.adminFeedService.getLatestFeeds({
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 피드 상세 조회' })
  @ApiResponse({ status: 200, type: AdminFeedDetailResponse })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @UseGuards(AdminGuard)
  @Get(':id')
  async getFeed(
    @Param('id', new ParseUUIDPipe()) feedId: string,
  ): Promise<AdminFeedDetailResponse> {
    return await this.adminFeedService.getFeed(feedId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 피드 삭제(작성자 검증 없음)' })
  @ApiResponse({ status: 204, description: '피드 삭제 성공' })
  @ApiResponse({ status: 404, description: '피드가 없음' })
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @Delete(':id')
  async deleteFeed(@Param('id', new ParseUUIDPipe()) feedId: string) {
    await this.adminFeedService.deleteOne(feedId);
    return;
  }
}
