import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { PostService } from 'src/provider/post.service';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { CreatePostDto, PostIdDto } from './dto/post';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Post()
  @UseGuards(JwtGuard)
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreatePostDto,
  ): Promise<PostIdDto> {
    return await this.postService.create(userId, dto);
  }
}
