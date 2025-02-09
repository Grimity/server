import { Module } from '@nestjs/common';
import { PostController } from 'src/controller/post.controller';
import { PostService } from 'src/provider/post.service';
import { PostRepository } from 'src/repository/post.repository';
import { PostSelectRepository } from 'src/repository/post.select.repository';
import { OpenSearchModule } from './opensearch.module';

@Module({
  imports: [OpenSearchModule],
  controllers: [PostController],
  providers: [PostService, PostRepository, PostSelectRepository],
})
export class PostModule {}
