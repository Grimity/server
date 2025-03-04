import { Module } from '@nestjs/common';
import { PostCommentController } from 'src/presentation/controller/post-comment.controller';
import { PostCommentService } from 'src/provider/post-comment.service';
import { PostCommentRepository } from 'src/repository/post-comment.repository';
import { AwsModule } from './aws.module';

@Module({
  imports: [AwsModule],
  controllers: [PostCommentController],
  providers: [PostCommentService, PostCommentRepository],
})
export class PostCommentModule {}
