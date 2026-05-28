import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class CommissionNoticeWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async upsertOne(userId: string, input: { title: string; content: string }) {
    return await this.txHost.tx.commissionNotice.upsert({
      where: { userId },
      create: { userId, title: input.title, content: input.content },
      update: { title: input.title, content: input.content },
      select: {
        title: true,
        content: true,
        updatedAt: true,
      },
    });
  }

  async deleteOne(userId: string) {
    await this.txHost.tx.commissionNotice.deleteMany({
      where: { userId },
    });
  }
}
