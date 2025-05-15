import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { convertCode } from './util/prisma-error-code';

@Injectable()
export class FeedRepository {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    return await this.prisma.feed.create({
      data: {
        authorId: userId,
        title: createFeedInput.title,
        content: createFeedInput.content,
        cards: createFeedInput.cards,
        thumbnail: createFeedInput.thumbnail,
        albumId: createFeedInput.albumId,
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
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return null;
      }
      throw e;
    }
  }

  async unlike(userId: string, feedId: string) {
    const [_, feed] = await this.prisma.$transaction([
      this.prisma.like.deleteMany({
        where: {
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
            decrement: 1,
          },
        },
        select: { likeCount: true },
      }),
    ]);
    return feed;
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
        if (convertCode(e.code) === 'NOT_FOUND') return;
      }
      throw e;
    }
  }

  async deleteOne(userId: string, feedId: string) {
    return await this.prisma.feed.delete({
      where: {
        id: feedId,
        authorId: userId,
      },
      select: { id: true },
    });
  }

  async updateOne(
    userId: string,
    updateFeedInput: CreateFeedInput & { feedId: string },
  ) {
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
          cards: updateFeedInput.cards,
          thumbnail: updateFeedInput.thumbnail,
          albumId: updateFeedInput.albumId,
        },
        select: { id: true },
      }),
    ]);
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
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return;
      }
      throw e;
    }
  }

  async deleteSave(userId: string, feedId: string) {
    await this.prisma.save.deleteMany({
      where: {
        userId,
        feedId,
      },
    });
    return;
  }

  async deleteMany(userId: string, ids: string[]) {
    const result = await this.prisma.feed.deleteMany({
      where: {
        AND: [
          {
            authorId: userId,
          },
          {
            id: {
              in: ids,
            },
          },
        ],
      },
    });

    return result.count;
  }

  async updateAlbum(
    userId: string,
    { albumId, feedIds }: { albumId: string | null; feedIds: string[] },
  ) {
    await this.prisma.feed.updateMany({
      where: {
        AND: [
          {
            authorId: userId,
          },
          {
            id: {
              in: feedIds,
            },
          },
        ],
      },
      data: {
        albumId,
      },
    });
    return;
  }
}

type CreateFeedInput = {
  title: string;
  cards: string[];
  content: string;
  tags: string[];
  thumbnail: string;
  albumId: string | null;
};
