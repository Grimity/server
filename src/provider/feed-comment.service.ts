import { Injectable } from '@nestjs/common';
import { FeedCommentRepository } from 'src/repository/feed-comment.repository';
import { NotificationRepository } from 'src/repository/notification.repository';

@Injectable()
export class FeedCommentService {
  constructor(
    private feedCommentRepository: FeedCommentRepository,
    private notificationRepository: NotificationRepository,
  ) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    const data = await this.feedCommentRepository.create(userId, input);

    if (userId === data.feed.authorId) return;

    const actorId = userId;
    const refId = input.feedId;
    const type = 'COMMENT';

    await this.notificationRepository.create({
      actorId,
      refId,
      type,
      userId: data.feed.authorId,
    });

    if (
      !data.parent ||
      data.parent.writerId === userId ||
      data.parent.writerId === data.feed.authorId
    )
      return;

    await this.notificationRepository.create({
      actorId,
      refId,
      type,
      userId: data.parent.writerId,
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
}

export type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
};
