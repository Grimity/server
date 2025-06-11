import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class FeedRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(userId: string, createFeedInput: CreateFeedInput) {
    return await this.txHost.tx.feed.create({
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

  async increaseLikeCount(feedId: string) {
    try {
      const feed = await this.txHost.tx.feed.update({
        where: {
          id: feedId,
        },
        data: {
          likeCount: {
            increment: 1,
          },
        },
        select: { likeCount: true },
      });
      return feed;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return null;
      }
      console.log(e);
      throw e;
    }
  }

  async createLike(userId: string, feedId: string) {
    try {
      const like = await this.txHost.tx.like.create({
        data: {
          userId,
          feedId,
        },
        select: { userId: true },
      });
      return like;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'UNIQUE_CONSTRAINT') return null;
      }
      throw e;
    }
  }

  async decreaseLikeCount(feedId: string) {
    try {
      const feed = await this.txHost.tx.feed.update({
        where: {
          id: feedId,
        },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
        select: { likeCount: true },
      });
      return feed;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return null;
      }
      throw e;
    }
  }

  async deleteLike(userId: string, feedId: string) {
    try {
      const like = await this.txHost.tx.like.deleteMany({
        where: {
          userId,
          feedId,
        },
      });
      return like;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (convertCode(e.code) === 'NOT_FOUND') return null;
      }
      throw e;
    }
  }

  async increaseViewCount(feedId: string) {
    try {
      await this.txHost.tx.feed.update({
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
    return await this.txHost.tx.feed.delete({
      where: {
        id: feedId,
        authorId: userId,
      },
      select: { id: true },
    });
  }

  async deleteTags(feedId: string) {
    await this.txHost.tx.tag.deleteMany({
      where: { feedId },
    });
    return;
  }

  async createTags(feedId: string, tags: string[]) {
    await this.txHost.tx.tag.createMany({
      data: tags.map((tag) => {
        return {
          feedId,
          tagName: tag,
        };
      }),
    });
    return;
  }

  async updateOne(userId: string, input: UpdateFeedInput) {
    return await this.txHost.tx.feed.update({
      where: {
        id: input.feedId,
        authorId: userId,
      },
      data: {
        title: input.title,
        content: input.content,
        cards: input.cards,
        thumbnail: input.thumbnail,
        albumId: input.albumId,
      },
      select: { id: true },
    });
  }

  async createSave(userId: string, feedId: string) {
    try {
      await this.txHost.tx.save.create({
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
    await this.txHost.tx.save.deleteMany({
      where: {
        userId,
        feedId,
      },
    });
    return;
  }

  async deleteMany(userId: string, ids: string[]) {
    const result = await this.txHost.tx.feed.deleteMany({
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
    await this.txHost.tx.feed.updateMany({
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

interface CreateFeedInput {
  title: string;
  cards: string[];
  content: string;
  tags: string[];
  thumbnail: string;
  albumId: string | null;
}

interface UpdateFeedInput extends Omit<CreateFeedInput, 'tags'> {
  feedId: string;
}
