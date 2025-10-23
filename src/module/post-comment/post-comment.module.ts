import { Module } from '@nestjs/common';
import { PostCommentController } from './post-comment.controller';
import { PostCommentService } from './post-comment.service';
import { PostCommentReader } from './repository/post-comment.reader';
import { PostCommentWriter } from './repository/post-comment.writer';

@Module({
  controllers: [PostCommentController],
  providers: [PostCommentService, PostCommentReader, PostCommentWriter],
})
export class PostCommentModule {}
