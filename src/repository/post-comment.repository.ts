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
}

type CreateInput = {
  userId: string;
  postId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string | null;
};
