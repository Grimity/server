import { Module } from '@nestjs/common';
import { FeedController } from 'src/controller/feed.controller';
import { FeedService } from 'src/provider/feed.service';
import { FeedRepository } from 'src/repository/feed.repository';
import { FeedSelectRepository } from 'src/repository/feed.select.repository';
import { AwsModule } from './aws.module';

@Module({
  imports: [AwsModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository, FeedSelectRepository],
  exports: [FeedSelectRepository],
})
export class FeedModule {}
