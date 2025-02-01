import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

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

  async findAllByFeedId(feedId: string) {
    return await this.prisma.feedComment.findMany({
      where: {
        feedId,
        parentId: null,
      },
      select: {
        id: true,
        parentId: true,
        content: true,
        createdAt: true,
        writer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        childComments: {
          select: {
            id: true,
            parentId: true,
            content: true,
            createdAt: true,
            writer: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
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
}

type CreateFeedCommentInput = {
  feedId: string;
  parentCommentId?: string | null;
  content: string;
  mentionedUserId?: string;
};
