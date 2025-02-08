import { Injectable } from '@nestjs/common';
import { PostCommentRepository } from 'src/repository/post-comment.repository';

@Injectable()
export class PostCommentService {
  constructor(private postCommentRepository: PostCommentRepository) {}
}
