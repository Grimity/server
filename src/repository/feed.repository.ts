import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeedRepository {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    return await this.prisma.feed.create({
      data: {
        authorId: userId,
        title: createFeedInput.title,
        content: createFeedInput.content,
        isAI: createFeedInput.isAI,
        cards: createFeedInput.cards,
        tags: {
          createMany: {
            data: createFeedInput.tags.map((tag) => {
              return {
                tagName: tag,
              };
            }),
          },
        },
      },
      select: {
        id: true,
      },
    });
  }

  async getFeedWithoutLogin(feedId: string) {
    try {
      return await this.prisma.feed.findUniqueOrThrow({
        where: {
          id: feedId,
        },
        select: {
          id: true,
          title: true,
          cards: true,
          isAI: true,
          createdAt: true,
          viewCount: true,
          likeCount: true,
          content: true,
          tags: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              _count: {
                select: {
                  followers: true,
                },
              },
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async getFeedWithLogin(userId: string, feedId: string) {
    try {
      return await this.prisma.feed.findUniqueOrThrow({
        where: {
          id: feedId,
        },
        select: {
          id: true,
          title: true,
          cards: true,
          isAI: true,
          createdAt: true,
          viewCount: true,
          likeCount: true,
          content: true,
          tags: true,
          likes: {
            where: {
              userId,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              _count: {
                select: {
                  followers: true,
                },
              },
              followers: {
                where: {
                  followerId: userId,
                },
              },
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async like(userId: string, feedId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.like.create({
          data: {
            userId,
            feedId,
          },
        }),
        this.prisma.feed.update({
          where: {
            id: feedId,
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
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async unlike(userId: string, feedId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.like.delete({
          where: {
            userId_feedId: {
              userId,
              feedId,
            },
          },
        }),
        this.prisma.feed.update({
          where: {
            id: feedId,
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
          throw new HttpException('LIKE', 404);
        }
      }
      throw e;
    }
  }

  async increaseViewCount(feedId: string) {
    try {
      await this.prisma.feed.update({
        where: {
          id: feedId,
        },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async createView(userId: string, feedId: string) {
    try {
      await this.prisma.view.upsert({
        where: {
          userId_feedId: {
            userId,
            feedId,
          },
        },
        update: {
          createdAt: new Date(),
        },
        create: {
          userId,
          feedId,
        },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async deleteOne(userId: string, feedId: string) {
    try {
      await this.prisma.feed.delete({
        where: {
          id: feedId,
          authorId: userId,
        },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async updateOne(
    userId: string,
    updateFeedInput: CreateFeedInput & { feedId: string },
  ) {
    try {
      await this.prisma.feed.update({
        where: {
          id: updateFeedInput.feedId,
          authorId: userId,
        },
        data: {
          title: updateFeedInput.title,
          content: updateFeedInput.content,
          isAI: updateFeedInput.isAI,
          cards: updateFeedInput.cards,
          tags: {
            deleteMany: {},
            createMany: {
              data: updateFeedInput.tags.map((tag) => {
                return {
                  tagName: tag,
                };
              }),
            },
          },
        },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async findManyByUserId(userId: string) {
    return await this.prisma.feed.findMany({
      where: {
        authorId: userId,
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      select: {
        id: true,
        title: true,
        cards: true,
        createdAt: true,
        viewCount: true,
        likeCount: true,
        _count: {
          select: {
            feedComments: true,
          },
        },
      },
      take: 12,
    });
  }

  async findManyByUserIdWithCursor(
    userId: string,
    cursor: { lastId: string; lastCreatedAt: string },
  ) {
    return await this.prisma.feed.findMany({
      where: {
        authorId: userId,
        OR: [
          {
            createdAt: {
              lt: new Date(cursor.lastCreatedAt),
            },
          },
          {
            createdAt: new Date(cursor.lastCreatedAt),
            id: {
              lt: cursor.lastId,
            },
          },
        ],
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      select: {
        id: true,
        title: true,
        cards: true,
        createdAt: true,
        viewCount: true,
        likeCount: true,
        _count: {
          select: {
            feedComments: true,
          },
        },
      },
      take: 12,
    });
  }
}

type CreateFeedInput = {
  title: string;
  cards: string[];
  isAI: boolean;
  content: string;
  tags: string[];
};
