import { Injectable } from '@nestjs/common';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class FeedReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async exists(feedId: string) {
    const feed = await this.txHost.tx.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });

    return !!feed;
  }

  async existsLike(userId: string, feedId: string) {
    const like = await this.txHost.tx.like.findUnique({
      where: {
        userId_feedId: {
          userId,
          feedId,
        },
      },
    });

    return !!like;
  }

  async getFeed(userId: string | null, feedId: string) {
    const [feed] = await this.txHost.tx.$kysely
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
      .innerJoin('User as Author', 'Feed.authorId', 'Author.id')
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
        'Author.id as authorId',
        'Author.name',
        'Author.image as image',
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
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('Block')
                .whereRef('Block.blockerId', '=', 'Author.id')
                .where('Block.blockingId', '=', kyselyUuid(userId!)),
            ])
            .as('isBlocked'),
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
        isBlocked: feed.isBlocked ?? false,
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

  async findManyByUserIdWithCursor({
    sort,
    size,
    cursor,
    targetId,
    albumId,
  }: FindFeedsByUserInput) {
    let query = this.txHost.tx.$kysely
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
          const [createdAt, id] = cursor!.split('_');
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
          const [likeCount, id] = cursor!.split('_');
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
          const [createdAt, id] = cursor!.split('_');
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

    let nextCursor: string | null = null;

    if (feeds.length === size) {
      if (sort === 'latest' || sort === 'oldest') {
        nextCursor = `${feeds[size - 1].createdAt.toISOString()}_${feeds[size - 1].id}`;
      } else {
        nextCursor = `${feeds[size - 1].likeCount}_${feeds[size - 1].id}`;
      }
    }

    return {
      nextCursor,
      feeds: feeds.map((feed) => ({
        id: feed.id,
        title: feed.title,
        cards: feed.cards,
        thumbnail: feed.thumbnail,
        createdAt: feed.createdAt,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        commentCount:
          feed.commentCount === null ? 0 : Number(feed.commentCount),
      })),
    };
  }

  async findManyLatestWithCursor({
    userId,
    cursor,
    size,
    blockingIds,
  }: GetFeedsInput) {
    let query = this.txHost.tx.$kysely
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
      .$if(blockingIds.length > 0, (eb) =>
        eb.where((eb) =>
          eb('Feed.authorId', 'not in', blockingIds.map(kyselyUuid)),
        ),
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

  async findManyByIdsOrderByLikeCount(userId: string | null, ids: string[]) {
    if (ids.length === 0) return [];
    const feeds = await this.txHost.tx.$kysely
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

  async findFollowingFeedsWithCursor({
    userId,
    size,
    cursor,
  }: FindFollowingFeedsInput) {
    let query = this.txHost.tx.$kysely
      .selectFrom('Follow')
      .where('followerId', '=', kyselyUuid(userId))
      .innerJoin('Feed', 'authorId', 'followingId')
      .select([
        'Feed.id',
        'Feed.title',
        'Feed.thumbnail',
        'Feed.cards',
        'Feed.content',
        'Feed.viewCount',
        'Feed.likeCount',
        'Feed.createdAt',
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
      .leftJoinLateral(
        (eb) =>
          eb
            .selectFrom('FeedComment')
            .whereRef('FeedComment.feedId', '=', 'Feed.id')
            .innerJoin('User', 'FeedComment.writerId', 'User.id')
            .select([
              'FeedComment.content',
              'FeedComment.id',
              'FeedComment.createdAt',
              'FeedComment.likeCount',
              'User.id as writerId',
              'User.name as writerName',
              'User.image as writerImage',
              'User.url as writerUrl',
            ])
            .orderBy('FeedComment.likeCount', 'desc')
            .limit(1)
            .as('FeedComment'),
        (join) => join.on((eb) => eb.lit(true)),
      )
      .select([
        'FeedComment.content as feedCommentContent',
        'FeedComment.createdAt as feedCommentCreatedAt',
        'FeedComment.id as feedCommentId',
        'FeedComment.likeCount as feedCommentLikeCount',
        'FeedComment.writerId as feedCommentWriterId',
        'FeedComment.writerImage as feedCommentWriterImage',
        'FeedComment.writerName as feedCommentWriterName',
        'FeedComment.writerUrl as feedCommentWriterUrl',
      ])
      .orderBy('Feed.createdAt', 'desc')
      .orderBy('Feed.id', 'desc')
      .limit(size);

    if (cursor) {
      const arr = cursor.split('_');
      if (arr.length !== 2)
        return {
          nextCursor: null,
          feeds: [],
        };

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
        comment: feed.feedCommentId
          ? {
              id: feed.feedCommentId,
              content: feed.feedCommentContent!,
              createdAt: feed.feedCommentCreatedAt!,
              likeCount: feed.feedCommentLikeCount!,
              writer: {
                id: feed.feedCommentWriterId!,
                name: feed.feedCommentWriterName!,
                image: feed.feedCommentWriterImage,
                url: feed.feedCommentWriterUrl!,
              },
            }
          : null,
      })),
    };
  }

  async findMyLikeFeedsWithCursor(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    const feeds = await this.txHost.tx.$kysely
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

    return {
      nextCursor:
        feeds.length === size ? feeds[size - 1].createdAt.toISOString() : null,
      feeds: feeds.map((feed) => ({
        id: feed.id,
        title: feed.title,
        thumbnail: feed.thumbnail,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        cards: feed.cards,
        createdAt: feed.createdAt,
        commentCount:
          feed.commentCount === null ? 0 : Number(feed.commentCount),
        author: {
          id: feed.authorId,
          name: feed.name,
          image: feed.image,
          url: feed.url,
        },
      })),
    };
  }

  async findMySaveFeedsWithCursor(
    userId: string,
    {
      cursor,
      size,
    }: {
      cursor: string | null;
      size: number;
    },
  ) {
    const feeds = await this.txHost.tx.$kysely
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

    return {
      nextCursor:
        feeds.length === size ? feeds[size - 1].createdAt.toISOString() : null,
      feeds: feeds.map((feed) => ({
        id: feed.id,
        title: feed.title,
        thumbnail: feed.thumbnail,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        cards: feed.cards,
        createdAt: feed.createdAt,
        commentCount:
          feed.commentCount === null ? 0 : Number(feed.commentCount),
        author: {
          id: feed.authorId,
          name: feed.name,
          image: feed.image,
          url: feed.url,
        },
      })),
    };
  }

  async findManyByIds(userId: string | null, feedIds: string[]) {
    if (feedIds.length === 0) return [];
    const feeds = await this.txHost.tx.$kysely
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

  async findLikesById(feedId: string) {
    return await this.txHost.tx.$kysely
      .selectFrom('Like')
      .where('feedId', '=', kyselyUuid(feedId))
      .innerJoin('User', 'Like.userId', 'User.id')
      .select(['User.id', 'name', 'User.image as image', 'description', 'url'])
      .execute();
  }

  async findAllIdsByUserId(userId: string) {
    const feeds = await this.txHost.tx.feed.findMany({
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
    const [feed] = await this.txHost.tx.$kysely
      .selectFrom('Feed')
      .where('id', '=', kyselyUuid(id))
      .select([
        'Feed.id',
        'title',
        'thumbnail',
        'Feed.createdAt',
        'content',
        'likeCount',
        'viewCount',
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
      .execute();

    if (!feed) return null;

    return {
      id: feed.id,
      title: feed.title,
      thumbnail: feed.thumbnail,
      createdAt: feed.createdAt,
      content: feed.content,
      tags: feed.tags ?? [],
      likeCount: feed.likeCount,
      viewCount: feed.viewCount,
    };
  }

  async findIdsByDateRange({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) {
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1); // +1일
    const feeds = await this.txHost.tx.feed.findMany({
      select: {
        id: true,
      },
      where: {
        createdAt: {
          gte: new Date(startDate),
          lt: adjustedEndDate,
        },
      },
      orderBy: {
        likeCount: 'desc',
      },
      take: 40,
    });

    return feeds.map((feed) => feed.id);
  }

  async findRankingIdsByMonth({
    year,
    month,
  }: {
    year: number;
    month: number;
  }) {
    const feeds = await this.txHost.tx.feed.findMany({
      where: {
        createdAt: {
          gte: new Date(year, month - 1, 1), // 월은 0부터 시작
          lt: new Date(year, month, 1),
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        likeCount: 'desc',
      },
      take: 40,
    });

    return feeds.map((feed) => feed.id);
  }

  async findPopularTagsByDateRange(startDate: Date, endDate: Date) {
    // ...existing code...
    return await this.txHost.tx.$queryRaw<
      { tagName: string; thumbnail: string }[]
    >`
      WITH filtered_tags AS (
        SELECT
          t."tagName",
          t."feedId"
        FROM "Tag" t
        JOIN "Feed" f ON t."feedId" = f.id
        WHERE f."createdAt" >= ${startDate} AND f."createdAt" < ${endDate}
      ),
      top_tags AS (
        SELECT
          "tagName",
          COUNT(*) AS tag_count
        FROM filtered_tags
        GROUP BY "tagName"
        ORDER BY tag_count DESC
        LIMIT 30
      ),
      tag_feed_thumbnails AS (
        SELECT
          ft."tagName",
          f.thumbnail,
          ROW_NUMBER() OVER (PARTITION BY ft."tagName" ORDER BY f."likeCount" DESC, f."createdAt" DESC) as rn
        FROM filtered_tags ft
        JOIN "Feed" f ON ft."feedId" = f.id
        WHERE ft."tagName" IN (SELECT "tagName" FROM top_tags)
      )
      SELECT
        "tagName",
        thumbnail
      FROM tag_feed_thumbnails
      WHERE rn = 1
    `;
  }

  async searchFeedsWithCursor({
    userId,
    keyword,
    sort,
    size,
    cursor,
  }: {
    userId?: string;
    keyword: string;
    sort: 'latest' | 'popular';
    size: number;
    cursor: string | null;
  }) {
    // title은 %keyword%, tags는 = keyword
    const result = await this.txHost.tx.$kysely
      .selectFrom('Feed')
      .innerJoin('User as Author', 'Feed.authorId', 'Author.id')
      .where((eb) =>
        eb.or([
          eb('Feed.title', 'ilike', `%${keyword}%`),
          eb('Feed.id', 'in', (eb) =>
            eb
              .selectFrom('Tag')
              .select('Tag.feedId')
              .where('Tag.tagName', '=', keyword),
          ),
        ]),
      )
      .select([
        'Feed.id',
        'Feed.title',
        'Feed.thumbnail',
        'Feed.createdAt',
        'Feed.viewCount',
        'Feed.likeCount',
        'Feed.content',
        'Feed.cards',
        'Author.id as authorId',
        'Author.name as authorName',
        'Author.image as authorImage',
        'Author.url as authorUrl',
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
        ]),
      )
      .$if(cursor !== null, (eb) => {
        if (sort === 'latest') {
          return eb.where('Feed.createdAt', '<', new Date(cursor!));
        } else {
          const [likeCount, id] = cursor!.split('_');
          return eb.where((eb) =>
            eb.or([
              eb('Feed.likeCount', '<', Number(likeCount)),
              eb.and([
                eb('Feed.likeCount', '=', Number(likeCount)),
                eb('Feed.id', '<', kyselyUuid(id)),
              ]),
            ]),
          );
        }
      })
      .orderBy(sort === 'latest' ? 'Feed.createdAt' : 'Feed.likeCount', 'desc')
      .orderBy('Feed.id', 'desc')
      .limit(size)
      .execute();

    let nextCursor: string | null = null;

    if (result.length === size) {
      if (sort === 'latest') {
        nextCursor = result[size - 1].createdAt.toISOString();
      } else {
        nextCursor = `${result[size - 1].likeCount}_${result[size - 1].id}`;
      }
    }

    return {
      nextCursor,
      feeds: result.map((feed) => ({
        id: feed.id,
        title: feed.title,
        thumbnail: feed.thumbnail,
        createdAt: feed.createdAt,
        viewCount: feed.viewCount,
        likeCount: feed.likeCount,
        content: feed.content,
        cards: feed.cards,
        commentCount:
          feed.commentCount === null ? 0 : Number(feed.commentCount),
        tags: feed.tags ?? [],
        isLike: feed.isLike ?? false,
        author: {
          id: feed.authorId,
          name: feed.authorName,
          image: feed.authorImage,
          url: feed.authorUrl,
        },
      })),
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
  cursor: string | null;
};

type GetFeedsInput = {
  userId?: string | null;
  cursor: string | null;
  size: number;
  blockingIds: string[];
};

type FindFeedsByUserInput = {
  sort: 'latest' | 'like' | 'oldest';
  size: number;
  cursor: string | null;
  targetId: string;
  albumId: string | null;
};
