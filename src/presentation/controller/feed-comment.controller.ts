import {
  Controller,
  Post,
  Body,
  UseGuards,
  Query,
  Get,
  ParseUUIDPipe,
  Delete,
  Param,
  HttpCode,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeedCommentService } from 'src/provider/feed-comment.service';
import { JwtGuard, OptionalJwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';

import {
  CreateFeedCommentRequest,
  GetFeedCommentRequest,
  GetChildFeedCommentRequest,
} from '../request/feed-comment.request';
import {
  FeedCommentsResponse,
  FeedChildCommentResponse,
} from '../response/feed-comment.response';

@ApiTags('/feed-comments')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('feed-comments')
export class FeedCommentController {
  constructor(private feedCommentService: FeedCommentService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 댓글 생성' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: '피드를 찾을 수 없음' })
  @Post()
  @UseGuards(JwtGuard)
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateFeedCommentRequest,
  ) {
    await this.feedCommentService.create(userId, dto);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 최상위 댓글 조회 - Optional Guard' })
  @ApiResponse({ status: 200, type: FeedCommentsResponse })
  @UseGuards(OptionalJwtGuard)
  @Get()
  async findAll(
    @CurrentUser() userId: string | null,
    @Query() { feedId }: GetFeedCommentRequest,
  ): Promise<FeedCommentsResponse> {
    return await this.feedCommentService.getAllByFeedId(userId, feedId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 자식 댓글 조회 - Optional Guard' })
  @ApiResponse({ status: 200, type: [FeedChildCommentResponse] })
  @UseGuards(OptionalJwtGuard)
  @Get('child-comments')
  async findChildComments(
    @CurrentUser() userId: string | null,
    @Query() query: GetChildFeedCommentRequest,
  ): Promise<FeedChildCommentResponse[]> {
    return await this.feedCommentService.getChildComments(userId, query);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 댓글 삭제' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete(':id')
  async deleteOne(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) commentId: string,
  ) {
    await this.feedCommentService.deleteOne(userId, commentId);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 댓글 좋아요' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '이미 좋아요를 누름' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Put(':id/like')
  async like(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) commentId: string,
  ) {
    await this.feedCommentService.like(userId, commentId);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 댓글 좋아요 취소' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete(':id/like')
  async unlike(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) commentId: string,
  ) {
    await this.feedCommentService.unlike(userId, commentId);
    return;
  }
}
