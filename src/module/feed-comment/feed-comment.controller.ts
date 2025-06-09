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
import { FeedCommentService } from './feed-comment.service';
import { JwtGuard, OptionalJwtGuard } from 'src/core/guard';
import { CurrentUser } from 'src/core/decorator';

import {
  CreateFeedCommentRequest,
  GetFeedCommentRequest,
  GetChildFeedCommentRequest,
} from './dto/feed-comment.request';
import {
  FeedCommentsResponse,
  FeedChildCommentResponse,
  ParentFeedCommentResponse,
} from './dto/feed-comment.response';

@ApiTags('/feed-comments')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('feed-comments')
export class FeedCommentController {
  constructor(private feedCommentService: FeedCommentService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 댓글 생성' })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 404,
    description: '피드가 없거나..상위댓글이 없거나..',
  })
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
  @ApiOperation({
    summary: '피드 댓글 조회 v2 - Optional Guard',
    deprecated: true,
  })
  @ApiResponse({ status: 200, type: [ParentFeedCommentResponse] })
  @UseGuards(OptionalJwtGuard)
  @Get('v2')
  async findAllV2(
    @CurrentUser() userId: string | null,
    @Query() { feedId }: GetFeedCommentRequest,
  ): Promise<ParentFeedCommentResponse[]> {
    return await this.feedCommentService.getComments(userId, feedId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 댓글 조회 - Optional Guard' })
  @ApiResponse({ status: 200, type: [ParentFeedCommentResponse] })
  @UseGuards(OptionalJwtGuard)
  @Get()
  async findAll(
    @CurrentUser() userId: string | null,
    @Query() { feedId }: GetFeedCommentRequest,
  ): Promise<ParentFeedCommentResponse[]> {
    return await this.feedCommentService.getComments(userId, feedId);
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
