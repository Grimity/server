import { Module } from '@nestjs/common';
import { PostController } from 'src/presentation/controller/post.controller';
import { PostService } from 'src/provider/post.service';
import { PostRepository } from 'src/repository/post.repository';
import { PostSelectRepository } from 'src/repository/post.select.repository';
import { SearchModule } from 'src/database/search/search.module';
import { RedisModule } from 'src/database/redis/redis.module';

@Module({
  imports: [SearchModule, RedisModule],
  controllers: [PostController],
  providers: [PostService, PostRepository, PostSelectRepository],
  exports: [PostSelectRepository],
})
export class PostModule {}
