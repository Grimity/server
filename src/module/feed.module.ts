import { Module } from '@nestjs/common';
import { FeedController } from 'src/controller/feed.controller';
import { FeedService } from 'src/provider/feed.service';
import { FeedRepository } from 'src/repository/feed.repository';
import { NotificationModule } from './notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
  exports: [FeedRepository],
})
export class FeedModule {}
