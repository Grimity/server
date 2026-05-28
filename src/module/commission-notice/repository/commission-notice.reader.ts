import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class CommissionNoticeReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findByUserId(userId: string) {
    return await this.txHost.tx.commissionNotice.findUnique({
      where: { userId },
      select: {
        title: true,
        content: true,
        updatedAt: true,
      },
    });
  }
}
