import { Injectable, HttpException } from '@nestjs/common';
import { FeedCommentRepository } from 'src/repository/feed-comment.repository';
import { AwsService } from './aws.service';
import { getImageUrl } from './util/get-image-url';

@Injectable()
export class FeedCommentService {
  constructor(
    private feedCommentRepository: FeedCommentRepository,
    private awsService: AwsService,
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
      comments: comments.map((comment) => ({
        ...comment,
        writer: {
          ...comment.writer,
          image: getImageUrl(comment.writer.image),
        },
      })),
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

    return comments.map((comment) => ({
      ...comment,
      writer: {
        ...comment.writer,
        image: getImageUrl(comment.writer.image),
      },
      mentionedUser: comment.mentionedUser
        ? {
            ...comment.mentionedUser,
            image: getImageUrl(comment.mentionedUser.image),
          }
        : null,
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
