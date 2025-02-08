import { Injectable } from '@nestjs/common';
import { PostCommentRepository } from 'src/repository/post-comment.repository';

@Injectable()
export class PostCommentService {
  constructor(private postCommentRepository: PostCommentRepository) {}

  async createPostComment(input: CreateInput) {
    await this.postCommentRepository.createPostComment(input);
    return;
  }
}

type CreateInput = {
  userId: string;
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
