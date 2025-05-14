import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { kyselyUuid } from './util';
import { convertCode } from './util/prisma-error-code';

@Injectable()
export class FeedCommentRepository {
  constructor(private prisma: PrismaService) {}

  async existsFeed(feedId: string) {
    const result = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });

    return result !== null;
  }

  async existsComment(commentId: string) {
    const result = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    return result !== null;
  }

  async create(userId: string, input: CreateFeedCommentInput) {
    return await this.prisma.feedComment.create({
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

  async findAllParentsByFeedId(userId: string | null, feedId: string) {
    const result = await this.prisma.$kysely
      .selectFrom('FeedComment')
      .where('parentId', 'is', null)
      .where('feedId', '=', kyselyUuid(feedId))
      .select([
        'FeedComment.id',
        'content',
        'FeedComment.createdAt',
        'likeCount',
        'FeedComment.writerId',
      ])
      .innerJoin('User', 'FeedComment.writerId', 'User.id')
      .select(['User.name', 'User.image', 'url'])
      .select((eb) =>
        eb
          .selectFrom('FeedComment as cm')
          .whereRef('cm.parentId', '=', 'FeedComment.id')
          .where('cm.feedId', '=', kyselyUuid(feedId))
          .select((eb) => eb.fn.count<bigint>('cm.id').as('childCommentCount'))
          .as('childCommentCount'),
      )
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

    return result.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      writer: {
        id: comment.writerId,
        name: comment.name,
        image: comment.image,
        url: comment.url,
      },
      likeCount: comment.likeCount,
      isLike: comment.isLike ?? false,
      childCommentCount:
        comment.childCommentCount === null
          ? 0
          : Number(comment.childCommentCount),
    }));
  }

  async findAllChildComments(
    userId: string | null,
    {
      feedId,
      parentId,
    }: {
      feedId: string;
      parentId: string;
    },
  ) {
    const result = await this.prisma.$kysely
      .selectFrom('FeedComment')
      .where('parentId', '=', kyselyUuid(parentId))
      .where('feedId', '=', kyselyUuid(feedId))
      .select([
        'FeedComment.id',
        'content',
        'FeedComment.createdAt',
        'likeCount',
        'FeedComment.writerId',
        'FeedComment.mentionedUserId',
      ])
      .innerJoin('User', 'FeedComment.writerId', 'User.id')
      .select([
        'User.name as writerName',
        'User.image',
        'User.url as writerUrl',
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

    return result.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      writer: {
        id: comment.writerId,
        name: comment.writerName,
        image: comment.image,
        url: comment.writerUrl,
      },
      likeCount: comment.likeCount,
      isLike: comment.isLike ?? false,
      mentionedUser: comment.mentionedUserId
        ? {
            id: comment.mentionedUserId,
            name: comment.mentionedUserName!,
            url: comment.mentionedUserUrl!,
            image: comment.mentionedUserImage,
          }
        : null,
    }));
  }

  async countByFeedId(feedId: string) {
    return await this.prisma.feedComment.count({
      where: {
        feedId,
      },
    });
  }

  async deleteOne(userId: string, commentId: string) {
    await this.prisma.feedComment.deleteMany({
      where: {
        id: commentId,
        writerId: userId,
      },
    });
    return;
  }

  async createLike(userId: string, commentId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.feedCommentLike.create({
          data: {
            userId,
            feedCommentId: commentId,
          },
        }),
        this.prisma.feedComment.update({
          where: {
            id: commentId,
          },
          data: {
            likeCount: {
              increment: 1,
            },
          },
          select: { id: true },
        }),
      ]);
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return;
      }
      throw e;
    }
  }

  async deleteLike(userId: string, commentId: string) {
    await this.prisma.$transaction([
      this.prisma.feedCommentLike.deleteMany({
        where: {
          userId,
          feedCommentId: commentId,
        },
      }),
      this.prisma.feedComment.update({
        where: {
          id: commentId,
        },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
        select: { id: true },
      }),
    ]);
    return;
  }
}

type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
