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
  ApiQuery,
} from '@nestjs/swagger';
import { FeedCommentService } from 'src/provider/feed-comment.service';
import { JwtGuard, OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import {
  CreateFeedCommentDto,
  FeedCommentResponseDto,
} from './dto/feed-comment';

@ApiTags('/feed-comments')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('feed-comments')
export class FeedCommentController {
  constructor(private feedCommentService: FeedCommentService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 댓글 생성' })
  @ApiResponse({ status: 201, description: '성공' })
  @ApiResponse({ status: 404, description: '피드를 찾을 수 없음' })
  @Post()
  @UseGuards(JwtGuard)
  async create(
    @CurrentUser() userId: string,
    @Body() createFeedCommentDto: CreateFeedCommentDto,
  ) {
    await this.feedCommentService.create(userId, createFeedCommentDto);
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 최상위 댓글 조회' })
  @ApiQuery({ name: 'feedId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: FeedCommentResponseDto,
  })
  @UseGuards(OptionalJwtGuard)
  @Get()
  async findAll(
    @CurrentUser() userId: string | null,
    @Query('feedId', ParseUUIDPipe) feedId: string,
  ): Promise<FeedCommentResponseDto> {
    return await this.feedCommentService.getAllByFeedId(userId, feedId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '피드 댓글 삭제' })
  @ApiResponse({ status: 204, description: '성공' })
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
  @ApiResponse({ status: 204, description: '성공' })
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
  @ApiResponse({ status: 204, description: '성공' })
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
