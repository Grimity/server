import { Injectable } from '@nestjs/common';
import { FeedCommentRepository } from 'src/repository/feed-comment.repository';
import { AwsService } from './aws.service';

@Injectable()
export class FeedCommentService {
  constructor(
    private feedCommentRepository: FeedCommentRepository,
    private awsService: AwsService,
  ) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    await this.feedCommentRepository.create(userId, input);
    await this.awsService.pushEvent({
      type: 'COMMENT',
      actorId: userId,
      feedId: input.feedId,
      parentCommentId: input.parentCommentId,
    });
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
