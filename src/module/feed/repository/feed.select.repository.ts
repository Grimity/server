import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { separator } from 'src/common/constants/separator-text';

@Injectable()
export class FeedSelectRepository {
  constructor(private prisma: PrismaService) {}

  async exists(feedId: string) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });

    return !!feed;
  }

  async getFeed(userId: string | null, feedId: string) {
    const [feed] = await this.prisma.$kysely
      .selectFrom('Feed')
      .where('Feed.id', '=', kyselyUuid(feedId))
      .select([
        'Feed.id',
        'title',
        'cards',
        'thumbnail',
        'Feed.createdAt',
        'viewCount',
        'likeCount',
        'content',
      ])
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .leftJoin('Album', 'Album.id', 'Feed.albumId')
      .select(['Album.id as albumId', 'Album.name as albumName'])
      .select((eb) =>
        eb
          .selectFrom('FeedComment')
          .whereRef('FeedComment.feedId', '=', 'Feed.id')
          .select((eb) =>
            eb.fn.count<bigint>('FeedComment.id').as('commentCount'),
          )
          .as('commentCount'),
      )
      .select([
        'User.id as authorId',
        'User.name',
        'User.image as image',
        'url',
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

    if (!feed) return null;

    return {
      id: feed.id,
      title: feed.title,
      cards: feed.cards,
      thumbnail: feed.thumbnail,
      createdAt: feed.createdAt,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      commentCount: feed.commentCount === null ? 0 : Number(feed.commentCount),
      content: feed.content,
      tags: feed.tags ?? [],
      isLike: feed.isLike ?? false,
      isSave: feed.isSave ?? false,
      author: {
        id: feed.authorId,
        name: feed.name,
        image: feed.image,
        url: feed.url,
      },
      album:
        feed.albumId && feed.albumName
          ? {
              id: feed.albumId,
              name: feed.albumName,
            }
          : null,
    };
  }

  async findManyByUserId({
    sort,
    size,
    cursor,
    targetId,
    albumId,
  }: FindFeedsByUserInput) {
    let query = this.prisma.$kysely
      .selectFrom('Feed')
      .where('authorId', '=', kyselyUuid(targetId))
      .select([
        'Feed.id',
        'title',
        'cards',
        'thumbnail',
        'Feed.createdAt',
        'viewCount',
        'likeCount',
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
      .limit(size)
      .$if(albumId !== null, (eb) => {
        return eb.where('Feed.albumId', '=', kyselyUuid(albumId!));
      });

    if (sort === 'latest') {
      query = query
        .orderBy('Feed.createdAt', 'desc')
        .orderBy('Feed.id', 'desc')
        .$if(cursor !== null, (eb) => {
          const [createdAt, id] = cursor!.split(separator);
          return eb.where((eb) =>
            eb.or([
              eb('Feed.createdAt', '<', new Date(createdAt)),
              eb.and([
                eb('Feed.createdAt', '=', new Date(createdAt)),
                eb('Feed.id', '<', kyselyUuid(id)),
              ]),
            ]),
          );
        });
    } else if (sort === 'like') {
      query = query
        .orderBy('Feed.likeCount', 'desc')
        .orderBy('Feed.id', 'desc')
        .$if(cursor !== null, (eb) => {
          const [likeCount, id] = cursor!.split(separator);
          return eb.where((eb) =>
            eb.or([
              eb('Feed.likeCount', '<', Number(likeCount)),
              eb.and([
                eb('Feed.likeCount', '=', Number(likeCount)),
                eb('Feed.id', '<', kyselyUuid(id)),
              ]),
            ]),
          );
        });
    } else {
      query = query
        .orderBy('Feed.createdAt', 'asc')
        .orderBy('Feed.id', 'desc')
        .$if(cursor !== null, (eb) => {
          const [createdAt, id] = cursor!.split(separator);
          return eb.where((eb) =>
            eb.or([
              eb('Feed.createdAt', '>', new Date(createdAt)),
              eb.and([
                eb('Feed.createdAt', '=', new Date(createdAt)),
                eb('Feed.id', '<', kyselyUuid(id)),
              ]),
            ]),
          );
        });
    }

    const feeds = await query.execute();

    return feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      cards: feed.cards,
      thumbnail: feed.thumbnail,
      createdAt: feed.createdAt,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      commentCount: feed.commentCount === null ? 0 : Number(feed.commentCount),
    }));
  }

  async findManyLatest({ userId, cursor, size }: GetFeedsInput) {
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
      .select(['User.id as authorId', 'name', 'User.image as image', 'url'])
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
      .orderBy('Feed.createdAt', 'desc')
      .orderBy('Feed.id', 'desc')
      .limit(size);

    if (cursor) {
      const arr = cursor.split('_');
      if (arr.length !== 2) {
        return {
          nextCursor: null,
          feeds: [],
        };
      }
      const lastCreatedAt = new Date(arr[0]);
      const lastId = arr[1];

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

    return {
      nextCursor:
        feeds.length === size
          ? `${feeds[size - 1].createdAt.toISOString()}_${feeds[size - 1].id}`
          : null,
      feeds: feeds.map((feed) => ({
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
          url: feed.url,
        },
      })),
    };
  }

  async findTodayPopularIds() {
    const result = await this.prisma.feed.findMany({
      select: {
        id: true,
      },
      where: {
        createdAt: {
          gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 3),
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
    if (ids.length === 0) return [];
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
      .select(['User.id as authorId', 'name', 'User.image as image', 'url'])
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
      .orderBy('likeCount', 'desc')
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
        image: feed.image,
        url: feed.url,
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
      .select(['User.id as authorId', 'name', 'User.image as image', 'url'])
      .orderBy('Feed.createdAt', 'desc')
      .orderBy('Feed.id', 'desc')
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
        cards: feed.cards ?? [],
        thumbnail: feed.thumbnail,
        content: feed.content,
        createdAt: feed.createdAt,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        commentCount:
          feed.commentCount === null ? 0 : Number(feed.commentCount),
        tags: feed.tags ?? [],
        author: {
          id: feed.authorId,
          name: feed.name,
          image: feed.image,
          url: feed.url,
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
    const feeds = await this.prisma.$kysely
      .selectFrom('Like')
      .select('Like.createdAt')
      .where('Like.userId', '=', kyselyUuid(userId))
      .$if(cursor !== null, (eb) =>
        eb.where('Like.createdAt', '<', new Date(cursor!)),
      )
      .innerJoin('Feed', 'Like.feedId', 'Feed.id')
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'viewCount',
        'likeCount',
        'cards',
        'Feed.authorId',
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
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .select(['name', 'User.image as image', 'url'])
      .orderBy('Like.createdAt', 'desc')
      .limit(size)
      .execute();

    return feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      thumbnail: feed.thumbnail,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      cards: feed.cards,
      createdAt: feed.createdAt,
      commentCount: feed.commentCount === null ? 0 : Number(feed.commentCount),
      author: {
        id: feed.authorId,
        name: feed.name,
        image: feed.image,
        url: feed.url,
      },
    }));
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
    const feeds = await this.prisma.$kysely
      .selectFrom('Save')
      .select('Save.createdAt')
      .where('Save.userId', '=', kyselyUuid(userId))
      .$if(cursor !== null, (eb) =>
        eb.where('Save.createdAt', '<', new Date(cursor!)),
      )
      .innerJoin('Feed', 'Save.feedId', 'Feed.id')
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'viewCount',
        'likeCount',
        'cards',
        'Feed.authorId',
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
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .select(['name', 'User.image as image', 'url'])
      .orderBy('Save.createdAt', 'desc')
      .limit(size)
      .execute();

    return feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      thumbnail: feed.thumbnail,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      cards: feed.cards,
      createdAt: feed.createdAt,
      commentCount: feed.commentCount === null ? 0 : Number(feed.commentCount),
      author: {
        id: feed.authorId,
        name: feed.name,
        image: feed.image,
        url: feed.url,
      },
    }));
  }

  async findManyByIds(userId: string | null, feedIds: string[]) {
    if (feedIds.length === 0) return [];
    const feeds = await this.prisma.$kysely
      .selectFrom('Feed')
      .where('Feed.id', 'in', feedIds.map(kyselyUuid))
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'viewCount',
        'likeCount',
        'Feed.authorId',
      ])
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .select(['name', 'User.image as image', 'url'])
      .select((eb) =>
        eb
          .selectFrom('Tag')
          .whereRef('Tag.feedId', '=', 'Feed.id')
          .select((eb) =>
            eb.fn<string[]>('array_agg', ['tagName']).as('tagName'),
          )
          .as('tags'),
      )
      .select((eb) =>
        eb
          .selectFrom('FeedComment')
          .whereRef('FeedComment.feedId', '=', 'Feed.id')
          .select((eb) =>
            eb.fn.count<bigint>('FeedComment.id').as('commentCount'),
          )
          .as('commentCount'),
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
        ]),
      )
      .execute();

    return feeds.map((feed) => ({
      id: feed.id,
      title: feed.title,
      thumbnail: feed.thumbnail,
      viewCount: feed.viewCount,
      likeCount: feed.likeCount,
      tags: feed.tags ?? [],
      commentCount: feed.commentCount === null ? 0 : Number(feed.commentCount),
      isLike: feed.isLike ?? false,
      author: {
        id: feed.authorId,
        name: feed.name,
        image: feed.image,
        url: feed.url,
      },
    }));
  }

  async findPopular({ userId, size, cursor, likeCount }: FindPopularInput) {
    let query = this.prisma.$kysely
      .selectFrom('Feed')
      .where('likeCount', '>', likeCount)
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'Feed.createdAt',
        'viewCount',
        'likeCount',
      ])
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .select(['User.id as authorId', 'name', 'User.image as image', 'url'])
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
      .orderBy('Feed.createdAt', 'desc')
      .orderBy('Feed.id', 'desc')
      .limit(size);

    if (cursor) {
      const [firstCursor, secondCursor] = cursor.split(separator);

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
        url: feed.url,
      },
    }));
  }

  async findLikesById(feedId: string) {
    return await this.prisma.$kysely
      .selectFrom('Like')
      .where('feedId', '=', kyselyUuid(feedId))
      .innerJoin('User', 'Like.userId', 'User.id')
      .select(['User.id', 'name', 'User.image as image', 'description', 'url'])
      .execute();
  }

  async findAllIdsByUserId(userId: string) {
    const feeds = await this.prisma.feed.findMany({
      select: {
        id: true,
      },
      where: {
        authorId: userId,
      },
    });
    return feeds.map((feed) => feed.id);
  }

  async findMeta(id: string) {
    const [feed] = await this.prisma.$kysely
      .selectFrom('Feed')
      .where('id', '=', kyselyUuid(id))
      .select(['Feed.id', 'title', 'thumbnail', 'Feed.createdAt', 'content'])
      .select((eb) =>
        eb
          .selectFrom('Tag')
          .whereRef('Tag.feedId', '=', 'Feed.id')
          .select((eb) =>
            eb.fn<string[]>('array_agg', ['tagName']).as('tagName'),
          )
          .as('tags'),
      )
      .execute();

    if (!feed) return null;

    return {
      id: feed.id,
      title: feed.title,
      thumbnail: feed.thumbnail,
      createdAt: feed.createdAt,
      content: feed.content,
      tags: feed.tags ?? [],
    };
  }
}

type FindPopularInput = {
  userId: string | null;
  size: number;
  cursor: string | null;
  likeCount: number;
};

type FindFollowingFeedsInput = {
  userId: string;
  size: number;
  lastCreatedAt: Date | null;
  lastId: string | null;
};

type GetFeedsInput = {
  userId?: string | null;
  cursor: string | null;
  size: number;
};

type FindFeedsByUserInput = {
  sort: 'latest' | 'like' | 'oldest';
  size: number;
  cursor: string | null;
  targetId: string;
  albumId: string | null;
};
