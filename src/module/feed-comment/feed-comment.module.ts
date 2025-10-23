import { Module } from '@nestjs/common';
import { FeedCommentController } from './feed-comment.controller';
import { FeedCommentService } from './feed-comment.service';
import { FeedCommentReader } from './repository/feed-comment.reader';
import { FeedCommentWriter } from './repository/feed-comment.writer';

@Module({
  controllers: [FeedCommentController],
  providers: [FeedCommentService, FeedCommentReader, FeedCommentWriter],
})
export class FeedCommentModule {}
