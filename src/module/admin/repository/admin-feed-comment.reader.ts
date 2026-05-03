import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

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
}
