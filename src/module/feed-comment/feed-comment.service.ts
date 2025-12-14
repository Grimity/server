import { Injectable, HttpException } from '@nestjs/common';
import { FeedCommentReader } from './repository/feed-comment.reader';
import { FeedCommentWriter } from './repository/feed-comment.writer';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class FeedCommentService {
  constructor(
    private readonly feedCommentReader: FeedCommentReader,
    private readonly feedCommentWriter: FeedCommentWriter,
    private readonly eventEmitter: TypedEventEmitter,
  ) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    const promiseMethods = [this.feedCommentReader.existsFeed(input.feedId)];

    if (input.parentCommentId) {
      promiseMethods.push(
        this.feedCommentReader.existsComment(input.parentCommentId),
      );
    }

    const [feedExists, commentExists] = await Promise.all(promiseMethods);

    if (!feedExists) throw new HttpException('FEED', 404);
    if (input.parentCommentId && !commentExists) {
      throw new HttpException('COMMENT', 404);
    }

    await this.feedCommentWriter.create(userId, input);

    if (input.mentionedUserId && input.parentCommentId) {
      this.eventEmitter.emit('notification:FEED_MENTION', {
        actorId: userId,
        feedId: input.feedId,
        mentionedUserId: input.mentionedUserId,
      });
    } else if (input.parentCommentId) {
      this.eventEmitter.emit('notification:FEED_REPLY', {
        actorId: userId,
        feedId: input.feedId,
        parentId: input.parentCommentId,
      });
    } else {
      this.eventEmitter.emit('notification:FEED_COMMENT', {
        actorId: userId,
        feedId: input.feedId,
      });
    }
    return;
  }

  async getComments(userId: string | null, feedId: string) {
    const comments = await this.feedCommentReader.findManyByFeedId(
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
    await this.feedCommentWriter.deleteOne(userId, commentId);
    return;
  }

  async like(userId: string, commentId: string) {
    const commentExists = await this.feedCommentReader.existsComment(commentId);

    if (!commentExists) throw new HttpException('COMMENT', 404);

    await this.likeTransaction(userId, commentId);
    return;
  }

  @Transactional()
  async likeTransaction(userId: string, commentId: string) {
    await Promise.all([
      this.feedCommentWriter.createLike(userId, commentId),
      this.feedCommentWriter.increaseLikeCount(commentId),
    ]);
    return;
  }

  async unlike(userId: string, commentId: string) {
    const commentExists = await this.feedCommentReader.existsComment(commentId);

    if (!commentExists) throw new HttpException('COMMENT', 404);

    await this.unlikeTransaction(userId, commentId);
    return;
  }

  @Transactional()
  async unlikeTransaction(userId: string, commentId: string) {
    await Promise.all([
      this.feedCommentWriter.deleteLike(userId, commentId),
      this.feedCommentWriter.decreaseLikeCount(commentId),
    ]);
    return;
  }
}

export type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
