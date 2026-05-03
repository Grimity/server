import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { AdminFeedCommentService } from './admin-feed-comment.service';
import {
  AdminGetFeedCommentsRequest,
  CreateAdminFeedCommentRequest,
} from './dto/admin-feed-comment.request';
import { AdminLatestFeedCommentsResponse } from './dto/admin-feed-comment.response';

@ApiExcludeController()
@ApiTags('/admin')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: '어드민 인증 실패' })
@Controller('admin/feed-comments')
export class AdminFeedCommentController {
  constructor(
    private readonly adminFeedCommentService: AdminFeedCommentService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 피드 댓글 목록 최신순 조회' })
  @ApiResponse({ status: 200, type: AdminLatestFeedCommentsResponse })
  @UseGuards(AdminGuard)
  @Get()
  async getComments(
    @Query() query: AdminGetFeedCommentsRequest,
  ): Promise<AdminLatestFeedCommentsResponse> {
    return await this.adminFeedCommentService.getLatestComments({
      cursor: query.cursor ?? null,
      size: query.size ?? 20,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '어드민 - 공식계정 명의 피드 댓글 생성 (writerId = OFFICIAL_USER_ID)',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: '피드 또는 부모 댓글이 없음' })
  @ApiResponse({
    status: 500,
    description: 'OFFICIAL_USER_ID 환경변수 미설정',
  })
  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() dto: CreateAdminFeedCommentRequest): Promise<void> {
    await this.adminFeedCommentService.create(dto);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '어드민 - 피드 댓글 삭제(작성자 검증 없음)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '댓글이 없음' })
  @UseGuards(AdminGuard)
  @HttpCode(204)
  @Delete(':id')
  async deleteOne(
    @Param('id', new ParseUUIDPipe()) commentId: string,
  ): Promise<void> {
    await this.adminFeedCommentService.deleteOne(commentId);
    return;
  }
}
