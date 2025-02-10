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

    if (input.mentionedUserId && input.parentCommentId) {
      await this.awsService.pushEvent({
        type: 'FEED_MENTION',
        actorId: userId,
        feedId: input.feedId,
        mentionedUserId: input.mentionedUserId,
      });
    } else if (input.parentCommentId) {
      await this.awsService.pushEvent({
        type: 'FEED_REPLY',
        actorId: userId,
        feedId: input.feedId,
        parentId: input.parentCommentId,
      });
    } else {
      await this.awsService.pushEvent({
        type: 'FEED_COMMENT',
        actorId: userId,
        feedId: input.feedId,
      });
    }
    return;
  }

  async getAllByFeedId(userId: string | null, feedId: string) {
    const [comments, commentCount] = await Promise.all([
      this.feedCommentRepository.findAllParentsByFeedId(userId, feedId),
      this.feedCommentRepository.countByFeedId(feedId),
    ]);

    return {
      comments: comments.map((comment) => {
        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          writer: {
            id: comment.writer.id,
            name: comment.writer.name,
            image: comment.writer.image,
          },
          likeCount: comment.likeCount,
          isLike: comment.likes?.length === 1,
          childCommentCount: comment._count.childComments,
        };
      }),
      commentCount,
    };
  }

  async getChildComments(
    userId: string | null,
    input: {
      feedId: string;
      parentId: string;
    },
  ) {
    const comments = await this.feedCommentRepository.findAllChildComments(
      userId,
      input,
    );

    return comments.map((comment) => {
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        writer: {
          id: comment.writer.id,
          name: comment.writer.name,
          image: comment.writer.image,
        },
        likeCount: comment.likeCount,
        isLike: comment.likes?.length === 1,
        mentionedUser: comment.mentionedUser,
      };
    });
  }

  async deleteOne(userId: string, commentId: string) {
    await this.feedCommentRepository.deleteOne(userId, commentId);
    return;
  }

  async like(userId: string, commentId: string) {
    await this.feedCommentRepository.createLike(userId, commentId);
    return;
  }

  async unlike(userId: string, commentId: string) {
    await this.feedCommentRepository.deleteLike(userId, commentId);
    return;
  }
}

export type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
