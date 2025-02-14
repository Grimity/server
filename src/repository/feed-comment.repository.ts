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
    const select: Prisma.FeedCommentSelect = {
      id: true,
      content: true,
      createdAt: true,
      writer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      likeCount: true,
      _count: {
        select: {
          childComments: true,
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
    }

    return await this.prisma.feedComment.findMany({
      where: {
        feedId,
        parentId: null,
      },
      select,
      orderBy: {
        createdAt: 'asc',
      },
    });
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
    const select: Prisma.FeedCommentSelect = {
      id: true,
      content: true,
      createdAt: true,
      writer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      likeCount: true,
      mentionedUser: {
        select: {
          id: true,
          name: true,
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
    }

    return await this.prisma.feedComment.findMany({
      where: {
        feedId,
        parentId,
      },
      select,
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
