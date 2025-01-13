import { Injectable } from '@nestjs/common';
import { FeedCommentRepository } from 'src/repository/feed-comment.repository';

@Injectable()
export class FeedCommentService {
  constructor(private feedCommentRepository: FeedCommentRepository) {}
}
