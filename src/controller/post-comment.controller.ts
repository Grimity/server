import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { PostCommentService } from 'src/provider/post-comment.service';
import { JwtGuard, OptionalJwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { CreatePostCommentDto, PostParentCommentDto } from './dto/post-comment';

@ApiTags('/post-comments')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('post-comments')
export class PostCommentController {
  constructor(private postCommentService: PostCommentService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 댓글 생성' })
  @ApiResponse({ status: 201, description: '성공' })
  @Post()
  @UseGuards(JwtGuard)
  async createPostComment(
    @CurrentUser() userId: string,
    @Body() createPostCommentDto: CreatePostCommentDto,
  ) {
    await this.postCommentService.create({
      ...createPostCommentDto,
      userId,
    });
    return;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시판 댓글 조회 - Optional Guard' })
  @ApiResponse({
    status: 200,
    description: '성공',
    type: PostParentCommentDto,
    isArray: true,
  })
  @Get()
  @UseGuards(OptionalJwtGuard)
  async getPostComments(
    @CurrentUser() userId: string | null,
    @Query('postId', ParseUUIDPipe) postId: string,
  ): Promise<PostParentCommentDto[]> {
    return await this.postCommentService.getComments(userId, postId);
  }
}
