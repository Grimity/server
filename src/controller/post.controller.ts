import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { PostService } from 'src/provider/post.service';
import { PostType } from 'src/common/constants';
import { JwtGuard } from 'src/common/guard';
import { CurrentUser } from 'src/common/decorator';
import { CreatePostDto } from './dto/post';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Post()
  @UseGuards(JwtGuard)
  async create(@CurrentUser() userId: string, @Body() dto: CreatePostDto) {
    console.log(userId, dto);
  }
}
