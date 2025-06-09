import { Injectable, HttpException } from '@nestjs/common';
import { FeedCommentRepository } from './repository/feed-comment.repository';
import { AwsService } from '../aws/aws.service';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FeedCommentService {
  constructor(
    private feedCommentRepository: FeedCommentRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    const promiseMethods = [
      this.feedCommentRepository.existsFeed(input.feedId),
    ];

    if (input.parentCommentId) {
      promiseMethods.push(
        this.feedCommentRepository.existsComment(input.parentCommentId),
      );
    }

    const [feedExists, commentExists] = await Promise.all(promiseMethods);

    if (!feedExists) throw new HttpException('FEED', 404);
    if (input.parentCommentId && !commentExists) {
      throw new HttpException('COMMENT', 404);
    }

    await this.feedCommentRepository.create(userId, input);

    if (input.mentionedUserId && input.parentCommentId) {
      this.eventEmitter.emit('notification.FEED_MENTION', {
        actorId: userId,
        feedId: input.feedId,
        mentionedUserId: input.mentionedUserId,
      });
    } else if (input.parentCommentId) {
      this.eventEmitter.emit('notification.FEED_REPLY', {
        actorId: userId,
        feedId: input.feedId,
        parentId: input.parentCommentId,
      });
    } else {
      this.eventEmitter.emit('notification.FEED_COMMENT', {
        actorId: userId,
        feedId: input.feedId,
      });
    }
    return;
  }

  async getComments(userId: string | null, feedId: string) {
    const comments = await this.feedCommentRepository.findManyByFeedId(
      userId,
      feedId,
    );

    return comments.map((comment) => ({
      ...comment,
      writer: {
        ...comment.writer,
        image: getImageUrl(comment.writer.image),
      },
      childComments: comment.childComments.map((childComment) => ({
        ...childComment,
        writer: {
          ...childComment.writer,
          image: getImageUrl(childComment.writer.image),
        },
        mentionedUser: childComment.mentionedUser
          ? {
              ...childComment.mentionedUser,
              image: getImageUrl(childComment.mentionedUser.image),
            }
          : null,
      })),
    }));
  }

  async deleteOne(userId: string, commentId: string) {
    await this.feedCommentRepository.deleteOne(userId, commentId);
    return;
  }

  async like(userId: string, commentId: string) {
    const commentExists =
      await this.feedCommentRepository.existsComment(commentId);

    if (!commentExists) throw new HttpException('COMMENT', 404);

    await this.feedCommentRepository.createLike(userId, commentId);
    return;
  }

  async unlike(userId: string, commentId: string) {
    const commentExists =
      await this.feedCommentRepository.existsComment(commentId);

    if (!commentExists) throw new HttpException('COMMENT', 404);

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
