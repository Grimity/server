import { Injectable } from '@nestjs/common';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class FeedCommentReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async existsFeed(feedId: string) {
    const result = await this.txHost.tx.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });

    return result !== null;
  }

  async existsComment(commentId: string) {
    const result = await this.txHost.tx.feedComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    return result !== null;
  }

  async findManyByFeedId(userId: string | null, feedId: string) {
    const result = await this.txHost.tx.$kysely
      .selectFrom('FeedComment')
      .where('feedId', '=', kyselyUuid(feedId))
      .select([
        'FeedComment.id',
        'FeedComment.content',
        'FeedComment.createdAt',
        'FeedComment.likeCount',
        'FeedComment.mentionedUserId',
        'FeedComment.parentId',
        'FeedComment.writerId',
      ])
      .innerJoin('User as writer', 'FeedComment.writerId', 'writer.id')
      .select([
        'writer.name as writerName',
        'writer.image as writerImage',
        'writer.url as writerUrl',
      ])
      .leftJoin('User as mu', 'FeedComment.mentionedUserId', 'mu.id')
      .select([
        'mu.name as mentionedUserName',
        'mu.url as mentionedUserUrl',
        'mu.image as mentionedUserImage',
      ])
      .$if(userId !== null, (eb) =>
        eb.select((eb) => [
          eb
            .fn<boolean>('EXISTS', [
              eb
                .selectFrom('FeedCommentLike')
                .whereRef(
                  'FeedCommentLike.feedCommentId',
                  '=',
                  'FeedComment.id',
                )
                .where('FeedCommentLike.userId', '=', kyselyUuid(userId!)),
            ])
            .as('isLike'),
        ]),
      )
      .orderBy('FeedComment.createdAt', 'asc')
      .execute();

    const comments: {
      id: string;
      content: string;
      createdAt: Date;
      likeCount: number;
      writer: {
        id: string;
        name: string;
        url: string;
        image: string | null;
      };
      isLike: boolean;
      childComments: {
        id: string;
        content: string;
        createdAt: Date;
        likeCount: number;
        writer: {
          id: string;
          name: string;
          url: string;
          image: string | null;
        };
        mentionedUser: {
          id: string;
          name: string;
          url: string;
          image: string | null;
        } | null;
        isLike: boolean;
      }[];
    }[] = [];

    const parentRecord = new Map<string, number>();

    for (const comment of result) {
      if (comment.parentId === null) {
        comments.push({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          writer: {
            id: comment.writerId,
            name: comment.writerName,
            url: comment.writerUrl,
            image: comment.writerImage,
          },
          isLike: comment.isLike ?? false,
          childComments: [],
        });

        parentRecord.set(comment.id, comments.length - 1);
      } else {
        comments[parentRecord.get(comment.parentId)!].childComments.push({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          writer: {
            id: comment.writerId,
            name: comment.writerName,
            url: comment.writerUrl,
            image: comment.writerImage,
          },
          isLike: comment.isLike ?? false,
          mentionedUser:
            comment.mentionedUserId && comment.mentionedUserName
              ? {
                  id: comment.mentionedUserId,
                  name: comment.mentionedUserName,
                  url: comment.mentionedUserUrl!,
                  image: comment.mentionedUserImage,
                }
              : null,
        });
      }
    }

    return comments;
  }
}
