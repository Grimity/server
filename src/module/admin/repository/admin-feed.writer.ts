import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class AdminFeedWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async deleteOne(feedId: string) {
    await this.txHost.tx.feed.deleteMany({
      where: { id: feedId },
    });
    return;
  }
}
