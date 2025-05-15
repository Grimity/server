import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { prismaUuid, kyselyUuid } from './util';

@Injectable()
export class PostCommentRepository {
  constructor(private prisma: PrismaService) {}

  async create({
    userId,
    postId,
    parentCommentId,
    mentionedUserId,
    content,
  }: CreateInput) {
    try {
      const [post] = await this.prisma.$transaction([
        this.prisma.postComment.create({
          data: {
            writerId: userId,
            postId,
            parentId: parentCommentId,
            mentionedUserId,
            content,
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } },
          select: { id: true },
        }),
      ]);
      return post;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('POST', 404);
        }
      }
      throw e;
    }
  }

  async findManyByPostId(userId: string | null, postId: string) {
    const result = await this.prisma.$kysely
      .selectFrom('PostComment')
      .where('PostComment.postId', '=', kyselyUuid(postId))
      .select([
        'PostComment.id',
        'PostComment.writerId',
        'PostComment.parentId',
        'PostComment.content',
        'PostComment.mentionedUserId',
        'PostComment.createdAt',
        'PostComment.likeCount',
        'PostComment.isDeleted',
      ])
      .leftJoin('User as w', 'w.id', 'PostComment.writerId')
      .select([
        'w.name as writerName',
        'w.url as writerUrl',
        'w.image as writerImage',
      ])
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('PostCommentLike')
                .whereRef(
                  'PostCommentLike.postCommentId',
                  '=',
                  'PostComment.id',
                )
                .where('PostCommentLike.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
        ]),
      )
      .leftJoin('User as m', 'm.id', 'PostComment.mentionedUserId')
      .select([
        'm.name as mentionedUserName',
        'm.url as mentionedUserUrl',
        'm.image as mentionedUserImage',
      ])
      .orderBy('PostComment.createdAt', 'asc')
      .execute();

    const comments: {
      id: string;
      content: string;
      createdAt: Date;
      likeCount: number;
      isDeleted: boolean;
      writer: {
        id: string;
        name: string;
        url: string;
        image: string | null;
      } | null;
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
        } | null;
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
          isDeleted: comment.isDeleted,
          writer:
            comment.writerId && comment.writerName
              ? {
                  id: comment.writerId,
                  name: comment.writerName,
                  url: comment.writerUrl!,
                  image: comment.writerImage,
                }
              : null,
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
          writer:
            comment.writerId && comment.writerName
              ? {
                  id: comment.writerId,
                  name: comment.writerName,
                  url: comment.writerUrl!,
                  image: comment.writerImage,
                }
              : null,
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

  async createLike(userId: string, commentId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.postCommentLike.create({
          data: {
            userId,
            postCommentId: commentId,
          },
        }),
        this.prisma.postComment.update({
          where: { id: commentId },
          data: { likeCount: { increment: 1 } },
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
        this.prisma.postCommentLike.delete({
          where: {
            postCommentId_userId: {
              postCommentId: commentId,
              userId,
            },
          },
        }),
        this.prisma.postComment.update({
          where: { id: commentId },
          data: { likeCount: { decrement: 1 } },
          select: { id: true },
        }),
      ]);
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('LIKE', 404);
        }
      }
      throw e;
    }
  }

  async findOneById(commentId: string) {
    try {
      return await this.prisma.postComment.findUniqueOrThrow({
        where: { id: commentId },
        select: {
          id: true,
          parentId: true,
          postId: true,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }

  async deleteParent({
    userId,
    postId,
    commentId,
  }: {
    userId: string;
    postId: string;
    commentId: string;
  }) {
    try {
      const [_, count] = await this.prisma.$transaction([
        this.prisma.postComment.update({
          where: {
            id: commentId,
            writerId: userId,
            parentId: null,
            isDeleted: false,
          },
          data: { isDeleted: true, content: '', writerId: null },
          select: { id: true },
        }),
        this.prisma.postComment.count({
          where: {
            parentId: commentId,
            postId,
          },
        }),
        this.prisma.post.update({
          where: { id: postId },
          data: { commentCount: { decrement: 1 } },
          select: { id: true },
        }),
      ]);

      if (count === 0) {
        await this.prisma.postComment.delete({
          where: { id: commentId },
          select: { id: true },
        });
      }
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }

  async deleteChild({
    userId,
    postId,
    commentId,
    parentId,
  }: {
    userId: string;
    postId: string;
    commentId: string;
    parentId: string;
  }) {
    try {
      const [_, [parentComment]] = await this.prisma.$transaction([
        this.prisma.postComment.delete({
          where: {
            id: commentId,
            writerId: userId,
          },
          select: { id: true },
        }),
        this.prisma.$queryRaw`
          SELECT
            "isDeleted",
            (select count(*) from "PostComment" where "parentId" = ${prismaUuid(parentId)} and "postId" = ${prismaUuid(postId)}) as "childCommentCount"
          FROM "PostComment"
          WHERE id = ${prismaUuid(parentId)}
        ` as Prisma.PrismaPromise<
          {
            isDeleted: boolean;
            childCommentCount: bigint;
          }[]
        >,
        this.prisma.post.update({
          where: { id: postId },
          data: { commentCount: { decrement: 1 } },
          select: { id: true },
        }),
      ]);

      if (!parentComment) throw new HttpException('COMMENT', 404);

      if (
        parentComment.isDeleted &&
        Number(parentComment.childCommentCount) === 0
      ) {
        await this.prisma.postComment.delete({
          where: { id: parentId },
          select: { id: true },
        });
      }
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('COMMENT', 404);
        }
      }
      throw e;
    }
  }
}

type CreateInput = {
  userId: string;
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
