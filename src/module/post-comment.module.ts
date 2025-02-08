import { Module } from '@nestjs/common';
import { PostCommentController } from 'src/controller/post-comment.controller';
import { PostCommentService } from 'src/provider/post-comment.service';
import { PostCommentRepository } from 'src/repository/post-comment.repository';

@Module({
  controllers: [PostCommentController],
  providers: [PostCommentService, PostCommentRepository],
})
export class PostCommentModule {}
