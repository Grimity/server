import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PostService } from 'src/provider/post.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { CreatePostDto, PostIdDto } from './dto/post';

@ApiTags('/posts')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 400, description: '유효성 검사 실패' })
@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 생성' })
  @ApiResponse({
    status: 201,
    description: '게시글 생성 성공',
    type: PostIdDto,
  })
  @Post()
  @UseGuards(JwtGuard)
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreatePostDto,
  ): Promise<PostIdDto> {
    return await this.postService.create(userId, dto);
  }
}
