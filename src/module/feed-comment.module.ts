import { Module } from '@nestjs/common';
import { FeedCommentController } from 'src/controller/feed-comment.controller';
import { FeedCommentService } from 'src/provider/feed-comment.service';
import { FeedCommentRepository } from 'src/repository/feed-comment.repository';
import { NotificationModule } from './notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [FeedCommentController],
  providers: [FeedCommentService, FeedCommentRepository],
})
export class FeedCommentModule {}
