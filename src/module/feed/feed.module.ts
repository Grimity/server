import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedRepository } from './repository/feed.repository';
import { FeedSelectRepository } from './repository/feed.select.repository';
import { AwsModule } from '../aws/aws.module';
import { SearchModule } from 'src/database/search/search.module';
import { DdbModule } from 'src/database/ddb/ddb.module';
import { RedisModule } from 'src/database/redis/redis.module';
import { TagController } from './tag.controller';

@Module({
  imports: [AwsModule, SearchModule, DdbModule, RedisModule],
  controllers: [FeedController, TagController],
  providers: [FeedService, FeedRepository, FeedSelectRepository],
  exports: [FeedSelectRepository, FeedRepository],
})
export class FeedModule {}
