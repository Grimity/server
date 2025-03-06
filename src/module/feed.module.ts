import { Module } from '@nestjs/common';
import { FeedController } from 'src/presentation/controller/feed.controller';
import { FeedService } from 'src/provider/feed.service';
import { FeedRepository } from 'src/repository/feed.repository';
import { FeedSelectRepository } from 'src/repository/feed.select.repository';
import { AwsModule } from './aws.module';
import { SearchModule } from 'src/database/search/search.module';
import { DdbModule } from 'src/database/ddb/ddb.module';
import { RedisModule } from 'src/database/redis/redis.module';

@Module({
  imports: [AwsModule, SearchModule, DdbModule, RedisModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository, FeedSelectRepository],
  exports: [FeedSelectRepository],
})
export class FeedModule {}
