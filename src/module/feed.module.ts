import { Module } from '@nestjs/common';
import { FeedController } from 'src/controller/feed.controller';
import { FeedService } from 'src/provider/feed.service';
import { FeedRepository } from 'src/repository/feed.repository';

@Module({
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
})
export class FeedModule {}
