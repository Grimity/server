import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedWriter } from './repository/feed.writer';
import { FeedReader } from './repository/feed.reader';
import { SearchModule } from 'src/database/search/search.module';
import { DdbModule } from 'src/database/ddb/ddb.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { TagController } from './tag.controller';

@Module({
  imports: [SearchModule, DdbModule, RedisModule],
  controllers: [FeedController, TagController],
  providers: [FeedService, FeedReader, FeedWriter],
  exports: [FeedReader, FeedWriter],
})
export class FeedModule {}
