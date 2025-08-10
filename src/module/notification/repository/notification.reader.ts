import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class NotificationReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findAll(userId: string) {
    return this.txHost.tx.notification.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
