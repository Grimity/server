import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { kyselyUuid } from './util';

@Injectable()
export class FeedCommentRepository {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, input: CreateFeedCommentInput) {
    try {
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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
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
    try {
      await this.prisma.feedComment.delete({
        where: {
          id: commentId,
          writerId: userId,
        },
        select: { id: true },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
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
        if (e.code === 'P2002') {
          throw new HttpException('LIKE', 409);
        } else if (e.code === 'P2003') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }

  async deleteLike(userId: string, commentId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.feedCommentLike.delete({
          where: {
            feedCommentId_userId: {
              feedCommentId: commentId,
              userId,
            },
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
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }
}

type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
