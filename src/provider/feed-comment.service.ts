import { Injectable } from '@nestjs/common';
import { FeedCommentRepository } from 'src/repository/feed-comment.repository';

@Injectable()
export class FeedCommentService {
  constructor(private feedCommentRepository: FeedCommentRepository) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    return await this.feedCommentRepository.create(userId, input);

    // TODO: notification
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

  async deleteOne(userId: string, commentId: string) {
    await this.feedCommentRepository.deleteOne(userId, commentId);
    return;
  }
}

export type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
};
