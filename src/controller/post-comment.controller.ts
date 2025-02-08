import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { PostCommentService } from 'src/provider/post-comment.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { CreatePostCommentDto } from './dto/post-comment';

@ApiTags('/post-comments')
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Controller('post-comments')
export class PostCommentController {
  constructor(private postCommentService: PostCommentService) {}

  @Post()
  @UseGuards(JwtGuard)
  async createPostComment(
    @CurrentUser() userId: string,
    @Body() createPostCommentDto: CreatePostCommentDto,
  ) {
    console.log(userId, createPostCommentDto);
  }
}
