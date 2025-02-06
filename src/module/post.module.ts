import { Module } from '@nestjs/common';
import { PostController } from 'src/controller/post.controller';
import { PostService } from 'src/provider/post.service';
import { PostRepository } from 'src/repository/post.repository';

@Module({
  controllers: [PostController],
  providers: [PostService, PostRepository],
})
export class PostModule {}
