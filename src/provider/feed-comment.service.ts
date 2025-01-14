import { Injectable } from '@nestjs/common';
import { FeedCommentRepository } from 'src/repository/feed-comment.repository';

@Injectable()
export class FeedCommentService {
  constructor(private feedCommentRepository: FeedCommentRepository) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    await this.feedCommentRepository.create(userId, input);
    return;
  }

  async getAllByFeedId(feedId: string) {
    const [comments, commentCount] = await Promise.all([
      this.feedCommentRepository.findAllByFeedId(feedId),
      this.feedCommentRepository.countByFeedId(feedId),
    ]);

    return {
      comments,
      commentCount,
    };
  }
}

export type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
};
