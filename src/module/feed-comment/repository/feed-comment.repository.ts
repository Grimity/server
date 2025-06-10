import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class FeedCommentRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async existsFeed(feedId: string) {
    const result = await this.txHost.tx.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });

    return result !== null;
  }

  async existsComment(commentId: string) {
    const result = await this.txHost.tx.feedComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    return result !== null;
  }

  async create(userId: string, input: CreateFeedCommentInput) {
    return await this.txHost.tx.feedComment.create({
      data: {
        writerId: userId,
        feedId: input.feedId,
        parentId: input.parentCommentId ?? null,
        content: input.content,
        mentionedUserId: input.mentionedUserId ?? null,
      },
      select: { id: true },
    });
  }

  async findManyByFeedId(userId: string | null, feedId: string) {
    const result = await this.txHost.tx.$kysely
      .selectFrom('FeedComment')
      .where('feedId', '=', kyselyUuid(feedId))
      .select([
        'FeedComment.id',
        'FeedComment.content',
        'FeedComment.createdAt',
        'FeedComment.likeCount',
        'FeedComment.mentionedUserId',
        'FeedComment.parentId',
        'FeedComment.writerId',
      ])
      .innerJoin('User as writer', 'FeedComment.writerId', 'writer.id')
      .select([
        'writer.name as writerName',
        'writer.image as writerImage',
        'writer.url as writerUrl',
      ])
      .leftJoin('User as mu', 'FeedComment.mentionedUserId', 'mu.id')
      .select([
        'mu.name as mentionedUserName',
        'mu.url as mentionedUserUrl',
        'mu.image as mentionedUserImage',
      ])
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('FeedCommentLike')
                .whereRef(
                  'FeedCommentLike.feedCommentId',
                  '=',
                  'FeedComment.id',
                )
                .where('FeedCommentLike.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
        ]),
      )
      .orderBy('FeedComment.createdAt', 'asc')
      .execute();

    const comments: {
      id: string;
      content: string;
      createdAt: Date;
      likeCount: number;
      writer: {
        id: string;
        name: string;
        url: string;
        image: string | null;
      };
      isLike: boolean;
      childComments: {
        id: string;
        content: string;
        createdAt: Date;
        likeCount: number;
        writer: {
          id: string;
          name: string;
          url: string;
          image: string | null;
        };
        mentionedUser: {
          id: string;
          name: string;
          url: string;
          image: string | null;
        } | null;
        isLike: boolean;
      }[];
    }[] = [];

    const parentRecord = new Map<string, number>();

    for (const comment of result) {
      if (comment.parentId === null) {
        comments.push({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          writer: {
            id: comment.writerId,
            name: comment.writerName,
            url: comment.writerUrl,
            image: comment.writerImage,
          },
          isLike: comment.isLike ?? false,
          childComments: [],
        });

        parentRecord.set(comment.id, comments.length - 1);
      } else {
        comments[parentRecord.get(comment.parentId)!].childComments.push({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          writer: {
            id: comment.writerId,
            name: comment.writerName,
            url: comment.writerUrl,
            image: comment.writerImage,
          },
          isLike: comment.isLike ?? false,
          mentionedUser:
            comment.mentionedUserId && comment.mentionedUserName
              ? {
                  id: comment.mentionedUserId,
                  name: comment.mentionedUserName,
                  url: comment.mentionedUserUrl!,
                  image: comment.mentionedUserImage,
                }
              : null,
        });
      }
    }

    return comments;
  }

  async deleteOne(userId: string, commentId: string) {
    await this.txHost.tx.feedComment.deleteMany({
      where: {
        id: commentId,
        writerId: userId,
      },
    });
    return;
  }

  async increaseLikeCount(commentId: string) {
    await this.txHost.tx.feedComment.update({
      where: { id: commentId },
      data: {
        likeCount: {
          increment: 1,
        },
      },
      select: { id: true },
    });
    return;
  }

  async decreaseLikeCount(commentId: string) {
    await this.txHost.tx.feedComment.update({
      where: { id: commentId },
      data: {
        likeCount: {
          decrement: 1,
        },
      },
      select: { id: true },
    });
    return;
  }

  async createLike(userId: string, commentId: string) {
    try {
      await this.txHost.tx.feedCommentLike.create({
        data: {
          userId,
          feedCommentId: commentId,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return;
      }
      throw e;
    }
  }

  async deleteLike(userId: string, commentId: string) {
    await this.txHost.tx.feedCommentLike.deleteMany({
      where: {
        userId,
        feedCommentId: commentId,
      },
    });
    return;
  }
}

type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
