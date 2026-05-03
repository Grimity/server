import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { kyselyUuid } from 'src/shared/util/convert-uuid';

@Injectable()
export class AdminFeedReader {
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

  async findManyLatest({
    cursor,
    size,
  }: {
    cursor: string | null;
    size: number;
  }) {
    let query = this.txHost.tx.$kysely
      .selectFrom('Feed')
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .select([
        'Feed.id as id',
        'Feed.title as title',
        'Feed.thumbnail as thumbnail',
        'Feed.createdAt as createdAt',
        'Feed.viewCount as viewCount',
        'Feed.likeCount as likeCount',
        'User.id as authorId',
        'User.name as authorName',
        'User.image as authorImage',
        'User.url as authorUrl',
      ])
      .select((eb) =>
        eb
          .selectFrom('FeedComment')
          .whereRef('FeedComment.feedId', '=', 'Feed.id')
          .select((eb) => eb.fn.count<bigint>('FeedComment.id').as('cnt'))
          .as('commentCount'),
      )
      .orderBy('Feed.createdAt', 'desc')
      .orderBy('Feed.id', 'desc')
      .limit(size);

    if (cursor) {
      const [iso, id] = cursor.split('_');
      if (!iso || !id) {
        return { nextCursor: null, feeds: [] };
      }
      const lastCreatedAt = new Date(iso);
      query = query.where((eb) =>
        eb.or([
          eb('Feed.createdAt', '<', lastCreatedAt),
          eb.and([
            eb('Feed.createdAt', '=', lastCreatedAt),
            eb('Feed.id', '<', kyselyUuid(id)),
          ]),
        ]),
      );
    }

    const rows = await query.execute();

    return {
      nextCursor:
        rows.length === size
          ? `${rows[size - 1].createdAt.toISOString()}_${rows[size - 1].id}`
          : null,
      feeds: rows.map((row) => ({
        id: row.id,
        title: row.title,
        thumbnail: row.thumbnail,
        createdAt: row.createdAt,
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        commentCount: row.commentCount === null ? 0 : Number(row.commentCount),
        author: {
          id: row.authorId,
          name: row.authorName,
          image: row.authorImage,
          url: row.authorUrl,
        },
      })),
    };
  }

  async getFeedDetail(feedId: string) {
    const [feed] = await this.txHost.tx.$kysely
      .selectFrom('Feed')
      .where('Feed.id', '=', kyselyUuid(feedId))
      .innerJoin('User as Author', 'Feed.authorId', 'Author.id')
      .leftJoin('Album', 'Album.id', 'Feed.albumId')
      .select([
        'Feed.id as id',
        'Feed.title as title',
        'Feed.cards as cards',
        'Feed.thumbnail as thumbnail',
        'Feed.createdAt as createdAt',
        'Feed.viewCount as viewCount',
        'Feed.likeCount as likeCount',
        'Feed.content as content',
        'Author.id as authorId',
        'Author.name as authorName',
        'Author.image as authorImage',
        'Author.url as authorUrl',
        'Album.id as albumId',
        'Album.name as albumName',
      ])
      .select((eb) =>
        eb
          .selectFrom('FeedComment')
          .whereRef('FeedComment.feedId', '=', 'Feed.id')
          .select((eb) => eb.fn.count<bigint>('FeedComment.id').as('cnt'))
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
      author: {
        id: feed.authorId,
        name: feed.authorName,
        image: feed.authorImage,
        url: feed.authorUrl,
      },
      album:
        feed.albumId && feed.albumName
          ? { id: feed.albumId, name: feed.albumName }
          : null,
    };
  }
}
