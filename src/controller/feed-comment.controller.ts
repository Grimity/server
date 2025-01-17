import {
  Controller,
  Post,
  Body,
  UseGuards,
  Query,
  Get,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FeedCommentService } from 'src/provider/feed-comment.service';
import { JwtGuard } from 'src/common/guard';
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

  @ApiOperation({ summary: '피드 댓글 조회' })
  @ApiQuery({ name: 'feedId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: FeedCommentResponseDto,
  })
  @Get()
  async findAll(
    @Query('feedId', ParseUUIDPipe) feedId: string,
  ): Promise<FeedCommentResponseDto> {
    return await this.feedCommentService.getAllByFeedId(feedId);
  }
}
