import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { kyselyUuid } from 'src/shared/util/convert-uuid';

@Injectable()
export class AdminFeedCommentReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async existsFeed(feedId: string) {
    const feed = await this.txHost.tx.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });
    return !!feed;
  }

  async existsComment(commentId: string) {
    const comment = await this.txHost.tx.feedComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    return !!comment;
  }

  async findManyLatest({
    cursor,
    size,
  }: {
    cursor: string | null;
    size: number;
  }) {
    let query = this.txHost.tx.$kysely
      .selectFrom('FeedComment')
      .innerJoin('User as Writer', 'FeedComment.writerId', 'Writer.id')
      .innerJoin('Feed', 'FeedComment.feedId', 'Feed.id')
      .select([
        'FeedComment.id as id',
        'FeedComment.content as content',
        'FeedComment.createdAt as createdAt',
        'FeedComment.parentId as parentId',
        'Writer.id as writerId',
        'Writer.name as writerName',
        'Writer.url as writerUrl',
        'Writer.image as writerImage',
        'Feed.id as feedId',
        'Feed.title as feedTitle',
        'Feed.thumbnail as feedThumbnail',
      ])
      .orderBy('FeedComment.createdAt', 'desc')
      .orderBy('FeedComment.id', 'desc')
      .limit(size);

    if (cursor) {
      const [iso, id] = cursor.split('_');
      if (!iso || !id) {
        return { nextCursor: null, comments: [] };
      }
      const lastCreatedAt = new Date(iso);
      query = query.where((eb) =>
        eb.or([
          eb('FeedComment.createdAt', '<', lastCreatedAt),
          eb.and([
            eb('FeedComment.createdAt', '=', lastCreatedAt),
            eb('FeedComment.id', '<', kyselyUuid(id)),
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
      comments: rows.map((row) => ({
        id: row.id,
        content: row.content,
        createdAt: row.createdAt,
        parentId: row.parentId,
        writer: {
          id: row.writerId,
          name: row.writerName,
          url: row.writerUrl,
          image: row.writerImage,
        },
        feed: {
          id: row.feedId,
          title: row.feedTitle,
          thumbnail: row.feedThumbnail,
        },
      })),
    };
  }
}
