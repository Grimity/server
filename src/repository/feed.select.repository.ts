import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';
import { kyselyUuid } from './util';
import { RedisService } from 'src/provider/redis.service';

@Injectable()
export class FeedSelectRepository {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getFeed(userId: string | null, feedId: string) {
    const [feed] = await this.prisma.$kysely
      .selectFrom('Feed')
      .where('Feed.id', '=', kyselyUuid(feedId))
      .select([
        'Feed.id',
        'title',
        'cards',
        'thumbnail',
        'isAI',
        'Feed.createdAt',
        'viewCount',
        'likeCount',
        'content',
      ])
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .select(['User.id as authorId', 'name', 'User.image as image'])
      .select((eb) =>
        eb
          .selectFrom('Tag')
          .whereRef('Tag.feedId', '=', 'Feed.id')
          .select((eb) =>
            eb.fn<string[]>('array_agg', ['tagName']).as('tagName'),
          )
          .as('tags'),
      )
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Like')
                .whereRef('Like.feedId', '=', 'Feed.id')
                .where('Like.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Save')
                .whereRef('Save.feedId', '=', 'Feed.id')
                .where('Save.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isSave'),
        ]),
      )
      .execute();

    if (!feed) throw new HttpException('FEED', 404);

    return {
      id: feed.id,
      title: feed.title,
      cards: feed.cards,
      thumbnail: feed.thumbnail,
      isAI: feed.isAI,
      createdAt: feed.createdAt,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      content: feed.content,
      tags: feed.tags ?? [],
      isLike: feed.isLike ?? false,
      isSave: feed.isSave ?? false,
      author: {
        id: feed.authorId,
        name: feed.name,
        image: feed.image,
      },
    };
  }

  async findManyByUserId({
    sort,
    size,
    cursor,
    targetId,
  }: FindFeedsByUserInput) {
    let orderBy: Prisma.FeedOrderByWithRelationInput[] = [];
    const where: Prisma.FeedWhereInput = {
      authorId: targetId,
    };
    let sortCursor: string | null = null;
    let idCursor: string | null = null;
    if (cursor) {
      const arr = cursor.split('_');
      if (arr.length !== 2) {
        throw new HttpException('invalid cursor', 400);
      }
      sortCursor = arr[0];
      idCursor = arr[1];
    }
    if (sort === 'latest') {
      orderBy = [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ];
      if (sortCursor && idCursor) {
        where.OR = [
          {
            createdAt: {
              lt: new Date(sortCursor),
            },
          },
          {
            createdAt: new Date(sortCursor),
            id: {
              lt: idCursor,
            },
          },
        ];
      }
    } else if (sort === 'like') {
      orderBy = [
        {
          likeCount: 'desc',
        },
        {
          id: 'desc',
        },
      ];
      if (sortCursor && idCursor) {
        where.OR = [
          {
            likeCount: {
              lt: Number(sortCursor),
            },
          },
          {
            likeCount: Number(sortCursor),
            id: {
              lt: idCursor,
            },
          },
        ];
      }
    } else {
      orderBy = [
        {
          createdAt: 'asc',
        },
        {
          id: 'desc',
        },
      ];
      if (sortCursor && idCursor) {
        where.OR = [
          {
            createdAt: {
              gt: new Date(sortCursor),
            },
          },
          {
            createdAt: new Date(sortCursor),
            id: {
              lt: idCursor,
            },
          },
        ];
      }
    }

    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      cards: true,
      thumbnail: true,
      createdAt: true,
      viewCount: true,
      likeCount: true,
      _count: {
        select: {
          comments: true,
        },
      },
    };

    return await this.prisma.feed.findMany({
      where,
      take: size,
      orderBy,
      select,
    });
  }

  async findManyLatest({ userId, lastId, lastCreatedAt, size }: GetFeedsInput) {
    let query = this.prisma.$kysely
      .selectFrom('Feed')
      .select([
        'Feed.id as id',
        'title',
        'thumbnail',
        'Feed.createdAt as createdAt',
        'viewCount',
        'likeCount',
      ])
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .select(['User.id as authorId', 'name'])
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Like')
                .whereRef('Like.feedId', '=', 'Feed.id')
                .where('Like.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
        ]),
      )
      .orderBy(['Feed.createdAt desc', 'Feed.id desc'])
      .limit(size);

    if (lastCreatedAt && lastId) {
      query = query.where((eb) => {
        return eb.or([
          eb('Feed.createdAt', '<', new Date(lastCreatedAt)),
          eb.and([
            eb('Feed.createdAt', '=', new Date(lastCreatedAt)),
            eb('Feed.id', '<', kyselyUuid(lastId)),
          ]),
        ]);
      });
    }

    const feeds = await query.execute();
    return feeds.map((feed) => {
      return {
        id: feed.id,
        title: feed.title,
        thumbnail: feed.thumbnail,
        createdAt: feed.createdAt,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        isLike: feed.isLike ?? false,
        author: {
          id: feed.authorId,
          name: feed.name,
        },
      };
    });
  }

  async getCachedTodayPopular() {
    const result = await this.redis.get('todayPopularFeeds');
    if (result === null) return null;
    return JSON.parse(result) as string[];
  }

  async findTodayPopularIds() {
    const result = await this.prisma.feed.findMany({
      select: {
        id: true,
      },
      where: {
        createdAt: {
          gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
        },
      },
      orderBy: {
        likeCount: 'desc',
      },
      take: 20,
    });
    return result.map((feed) => feed.id);
  }

  async findTodayPopularByIds(userId: string | null, ids: string[]) {
    const feeds = await this.prisma.$kysely
      .selectFrom('Feed')
      .where(
        'Feed.id',
        'in',
        ids.map((id) => kyselyUuid(id)),
      )
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'Feed.createdAt',
        'viewCount',
        'likeCount',
      ])
      .innerJoin('User', 'authorId', 'User.id')
      .select(['User.id as authorId', 'name'])
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Like')
                .whereRef('Like.feedId', '=', 'Feed.id')
                .where('Like.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
        ]),
      )
      .orderBy(['likeCount desc'])
      .limit(12)
      .execute();

    return feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      thumbnail: feed.thumbnail,
      createdAt: feed.createdAt,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      isLike: feed.isLike ?? false,
      author: {
        id: feed.authorId,
        name: feed.name,
      },
    }));
  }

  async findFollowingFeeds({
    userId,
    size,
    lastCreatedAt,
    lastId,
  }: FindFollowingFeedsInput) {
    let query = this.prisma.$kysely
      .selectFrom('Follow')
      .where('followerId', '=', kyselyUuid(userId))
      .innerJoin('Feed', 'authorId', 'followingId')
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'cards',
        'content',
        'viewCount',
        'likeCount',
        'Feed.createdAt as createdAt',
        'isAI',
      ])
      .select((eb) =>
        eb
          .selectFrom('Tag')
          .whereRef('Tag.feedId', '=', 'Feed.id')
          .select((eb) =>
            eb.fn<string[]>('array_agg', ['tagName']).as('tagName'),
          )
          .as('tags'),
      )
      .select((eb) => [
        eb
          .fn<boolean>('EXISTS', [
            eb
              .selectFrom('Like')
              .whereRef('Like.feedId', '=', 'Feed.id')
              .where('Like.userId', '=', kyselyUuid(userId!)),
          ])
          .as('isLike'),
        eb
          .fn<boolean>('EXISTS', [
            eb
              .selectFrom('Save')
              .whereRef('Save.feedId', '=', 'Feed.id')
              .where('Save.userId', '=', kyselyUuid(userId!)),
          ])
          .as('isSave'),
      ])
      .select((eb) =>
        eb
          .selectFrom('FeedComment')
          .whereRef('FeedComment.feedId', '=', 'Feed.id')
          .select((eb) =>
            eb.fn.count<bigint>('FeedComment.id').as('commentCount'),
          )
          .as('commentCount'),
      )
      .innerJoin('User', 'followingId', 'User.id')
      .select(['User.id as authorId', 'name', 'User.image as image'])
      .orderBy(['Feed.createdAt desc', 'Feed.id desc'])
      .limit(size);

    if (lastCreatedAt && lastId) {
      query = query.where((eb) => {
        return eb.or([
          eb('Feed.createdAt', '<', new Date(lastCreatedAt)),
          eb.and([
            eb('Feed.createdAt', '=', new Date(lastCreatedAt)),
            eb('Feed.id', '<', kyselyUuid(lastId)),
          ]),
        ]);
      });
    }

    const feeds = await query.execute();

    return feeds.map((feed) => {
      return {
        id: feed.id,
        title: feed.title,
        cards: feed.cards,
        thumbnail: feed.thumbnail,
        content: feed.content,
        createdAt: feed.createdAt,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        isAI: feed.isAI,
        commentCount:
          feed.commentCount === null ? 0 : Number(feed.commentCount),
        tags: feed.tags ?? [],
        author: {
          id: feed.authorId,
          name: feed.name,
          image: feed.image,
        },
        isLike: feed.isLike,
        isSave: feed.isSave,
      };
    });
  }

  async findMyLikeFeeds(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    let where: Prisma.LikeWhereInput = {
      userId,
    };

    if (cursor) {
      where = {
        ...where,
        createdAt: {
          lt: new Date(cursor),
        },
      };
    }

    return await this.prisma.like.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: size,
      select: {
        createdAt: true,
        feed: {
          select: {
            id: true,
            title: true,
            cards: true,
            thumbnail: true,
            viewCount: true,
            likeCount: true,
            _count: {
              select: {
                comments: true,
              },
            },
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findMySaveFeeds(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    let where: Prisma.SaveWhereInput = {
      userId,
    };

    if (cursor) {
      where = {
        ...where,
        createdAt: {
          lt: new Date(cursor),
        },
      };
    }

    return await this.prisma.save.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: size,
      select: {
        createdAt: true,
        feed: {
          select: {
            id: true,
            title: true,
            cards: true,
            thumbnail: true,
            viewCount: true,
            likeCount: true,
            _count: {
              select: {
                comments: true,
              },
            },
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findManyByIds(userId: string | null, feedIds: string[]) {
    const select: Prisma.FeedSelect = {
      id: true,
      title: true,
      thumbnail: true,
      likeCount: true,
      viewCount: true,
      tags: {
        select: {
          tagName: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          comments: true,
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

    return await this.prisma.feed.findMany({
      where: {
        id: {
          in: feedIds,
        },
      },
      select,
    });
  }

  async findPopular({ userId, size, cursor }: FindPopularInput) {
    let query = this.prisma.$kysely
      .selectFrom('Feed')
      .where('likeCount', '>', 0)
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'Feed.createdAt',
        'viewCount',
        'likeCount',
      ])
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .select(['User.id as authorId', 'name', 'User.image as image'])
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Like')
                .whereRef('Like.feedId', '=', 'Feed.id')
                .where('Like.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
        ]),
      )
      .orderBy(['Feed.createdAt desc', 'Feed.id desc'])
      .limit(size);

    if (cursor) {
      const [firstCursor, secondCursor] = cursor.split('_');

      query = query.where((eb) => {
        return eb.or([
          eb('Feed.createdAt', '<', new Date(firstCursor)),
          eb.and([
            eb('Feed.createdAt', '=', new Date(firstCursor)),
            eb('Feed.id', '<', kyselyUuid(secondCursor)),
          ]),
        ]);
      });
    }

    const feeds = await query.execute();
    return feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      thumbnail: feed.thumbnail,
      createdAt: feed.createdAt,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      isLike: feed.isLike ?? false,
      author: {
        id: feed.authorId,
        name: feed.name,
        image: feed.image,
      },
    }));
  }

  async findLikesById(feedId: string) {
    return await this.prisma.$kysely
      .selectFrom('Like')
      .where('feedId', '=', kyselyUuid(feedId))
      .innerJoin('User', 'Like.userId', 'User.id')
      .select(['User.id', 'name', 'User.image as image', 'description'])
      .execute();
  }
}

type FindPopularInput = {
  userId: string | null;
  size: number;
  cursor: string | null;
};

type FindFollowingFeedsInput = {
  userId: string;
  size: number;
  lastCreatedAt: Date | null;
  lastId: string | null;
};

type GetFeedsInput = {
  userId?: string | null;
  lastId: string | null;
  lastCreatedAt: Date | null;
  size: number;
};

type FindFeedsByUserInput = {
  sort: 'latest' | 'like' | 'oldest';
  size: number;
  cursor: string | null;
  targetId: string;
};
