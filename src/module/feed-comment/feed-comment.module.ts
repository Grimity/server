import { Module } from '@nestjs/common';
import { FeedCommentController } from './feed-comment.controller';
import { FeedCommentService } from './feed-comment.service';
import { FeedCommentRepository } from './repository/feed-comment.repository';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [AwsModule],
  controllers: [FeedCommentController],
  providers: [FeedCommentService, FeedCommentRepository],
})
export class FeedCommentModule {}
