import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

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
      await this.prisma.$transaction([
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
        }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('POST', 404);
        }
      }
    }
  }

  async findManyByPostId(userId: string | null, postId: string) {
    const select: Prisma.PostCommentSelect & {
      childComments: {
        select: Prisma.PostCommentSelect;
        where: Prisma.PostCommentWhereInput;
        orderBy: Prisma.PostCommentOrderByWithRelationInput;
      };
    } = {
      id: true,
      content: true,
      createdAt: true,
      likeCount: true,
      isDeleted: true,
      writer: {
        select: {
          id: true,
          name: true,
        },
      },
      childComments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          likeCount: true,
          writer: {
            select: {
              id: true,
              name: true,
            },
          },
          mentionedUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        where: {
          postId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    };

    if (userId) {
      select.likes = {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      };

      select.childComments!.select.likes = {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      };
    }

    return await this.prisma.postComment.findMany({
      where: {
        postId,
        parentId: null,
      },
      select,
      orderBy: {
        createdAt: 'asc',
      },
    });
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
        }),
      ]);
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('LIKE', 404);
        }
      }
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
