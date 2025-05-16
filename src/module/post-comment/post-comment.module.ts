import { Module } from '@nestjs/common';
import { PostCommentController } from './post-comment.controller';
import { PostCommentService } from './post-comment.service';
import { PostCommentRepository } from './repository/post-comment.repository';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [AwsModule],
  controllers: [PostCommentController],
  providers: [PostCommentService, PostCommentRepository],
})
export class PostCommentModule {}
