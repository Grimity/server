import { Module } from '@nestjs/common';
import { FeedCommentController } from 'src/controller/feed-comment.controller';
import { FeedCommentService } from 'src/provider/feed-comment.service';
import { FeedCommentRepository } from 'src/repository/feed-comment.repository';
import { AwsModule } from './aws.module';

@Module({
  imports: [AwsModule],
  controllers: [FeedCommentController],
  providers: [FeedCommentService, FeedCommentRepository],
})
export class FeedCommentModule {}
