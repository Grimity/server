import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostRepository } from './repository/post.repository';
import { PostSelectRepository } from './repository/post.select.repository';
import { SearchModule } from 'src/database/search/search.module';
import { RedisModule } from 'src/database/redis/redis.module';

@Module({
  imports: [SearchModule, RedisModule],
  controllers: [PostController],
  providers: [PostService, PostRepository, PostSelectRepository],
  exports: [PostSelectRepository],
})
export class PostModule {}
