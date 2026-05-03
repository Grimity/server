import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { AdminParentFeedCommentResponse } from '../dto/admin-feed-comment.response';

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

  async findManyByFeedId(
    feedId: string,
  ): Promise<AdminParentFeedCommentResponse[]> {
    const result = await this.txHost.tx.$kysely
      .selectFrom('FeedComment')
      .where('FeedComment.feedId', '=', kyselyUuid(feedId))
      .innerJoin('User as w', 'w.id', 'FeedComment.writerId')
      .leftJoin('User as m', 'm.id', 'FeedComment.mentionedUserId')
      .select([
        'FeedComment.id',
        'FeedComment.writerId',
        'FeedComment.parentId',
        'FeedComment.content',
        'FeedComment.mentionedUserId',
        'FeedComment.createdAt',
        'FeedComment.likeCount',
        'w.name as writerName',
        'w.url as writerUrl',
        'w.image as writerImage',
        'm.name as mentionedUserName',
        'm.url as mentionedUserUrl',
        'm.image as mentionedUserImage',
      ])
      .orderBy('FeedComment.createdAt', 'asc')
      .execute();

    const comments: AdminParentFeedCommentResponse[] = [];
    const parentRecord = new Map<string, number>();

    for (const row of result) {
      const writer = {
        id: row.writerId,
        name: row.writerName,
        url: row.writerUrl,
        image: row.writerImage,
      };

      if (row.parentId === null) {
        comments.push({
          id: row.id,
          content: row.content,
          createdAt: row.createdAt,
          likeCount: row.likeCount,
          writer,
          childComments: [],
        });
        parentRecord.set(row.id, comments.length - 1);
      } else {
        const idx = parentRecord.get(row.parentId);
        if (idx === undefined) continue;
        comments[idx].childComments.push({
          id: row.id,
          content: row.content,
          createdAt: row.createdAt,
          likeCount: row.likeCount,
          writer,
          mentionedUser:
            row.mentionedUserId && row.mentionedUserName
              ? {
                  id: row.mentionedUserId,
                  name: row.mentionedUserName,
                  url: row.mentionedUserUrl!,
                  image: row.mentionedUserImage,
                }
              : null,
        });
      }
    }

    return comments;
  }
}
