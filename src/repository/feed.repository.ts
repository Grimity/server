import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from 'src/database/redis/redis.service';

@Injectable()
export class FeedRepository {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    return await this.prisma.feed.create({
      data: {
        authorId: userId,
        title: createFeedInput.title,
        content: createFeedInput.content,
        isAI: createFeedInput.isAI,
        cards: createFeedInput.cards,
        thumbnail: createFeedInput.thumbnail,
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
      select: { id: true },
    });
  }

  async like(userId: string, feedId: string) {
    try {
      const [, feed] = await this.prisma.$transaction([
        this.prisma.like.create({
          data: {
            userId,
            feedId,
          },
          select: { userId: true },
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
          select: {
            likeCount: true,
          },
        }),
      ]);
      return feed;
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
          select: { userId: true },
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
        select: { id: true },
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
        select: { userId: true },
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
      return await this.prisma.feed.delete({
        where: {
          id: feedId,
          authorId: userId,
        },
        select: { id: true },
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

  async updateOne(
    userId: string,
    updateFeedInput: CreateFeedInput & { feedId: string },
  ) {
    try {
      await this.prisma.$transaction([
        this.prisma.tag.deleteMany({
          where: {
            feedId: updateFeedInput.feedId,
          },
        }),
        this.prisma.tag.createMany({
          data: updateFeedInput.tags.map((tag) => {
            return {
              feedId: updateFeedInput.feedId,
              tagName: tag,
            };
          }),
        }),
        this.prisma.feed.update({
          where: {
            id: updateFeedInput.feedId,
            authorId: userId,
          },
          data: {
            title: updateFeedInput.title,
            content: updateFeedInput.content,
            isAI: updateFeedInput.isAI,
            cards: updateFeedInput.cards,
            thumbnail: updateFeedInput.thumbnail,
          },
          select: { id: true },
        }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025' || e.code === 'P2003') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async createSave(userId: string, feedId: string) {
    try {
      await this.prisma.save.create({
        data: {
          userId,
          feedId,
        },
        select: { userId: true },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new HttpException('SAVE', 409);
        } else if (e.code === 'P2003') {
          throw new HttpException('FEED', 404);
        }
      }
      throw e;
    }
  }

  async deleteSave(userId: string, feedId: string) {
    try {
      await this.prisma.save.delete({
        where: {
          userId_feedId: {
            userId,
            feedId,
          },
        },
        select: { userId: true },
      });
      return;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new HttpException('SAVE', 404);
        }
      }
      throw e;
    }
  }

  async cacheTodayPopular(ids: string[]) {
    await this.redis.set(
      'todayPopularFeeds',
      JSON.stringify(ids),
      'EX',
      60 * 30,
    );
    return;
  }
}

type CreateFeedInput = {
  title: string;
  cards: string[];
  isAI: boolean;
  content: string;
  tags: string[];
  thumbnail: string;
};
