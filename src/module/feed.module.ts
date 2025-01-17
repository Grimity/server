import { Module } from '@nestjs/common';
import { FeedController } from 'src/controller/feed.controller';
import { FeedService } from 'src/provider/feed.service';
import { FeedRepository } from 'src/repository/feed.repository';
import { AwsModule } from './aws.module';

@Module({
  imports: [AwsModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
  exports: [FeedRepository],
})
export class FeedModule {}
