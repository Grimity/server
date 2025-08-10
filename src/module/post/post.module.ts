import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostWriter } from './repository/post.writer';
import { PostReader } from './repository/post.reader';
import { SearchModule } from 'src/database/search/search.module';
import { RedisModule } from 'src/database/redis/redis.module';

@Module({
  imports: [SearchModule, RedisModule],
  controllers: [PostController],
  providers: [PostService, PostReader, PostWriter],
  exports: [PostReader],
})
export class PostModule {}
