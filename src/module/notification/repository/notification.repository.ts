import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class NotificationRepository {
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

  async readAll(userId: string) {
    await this.txHost.tx.notification.updateMany({
      where: {
        userId,
      },
      data: {
        isRead: true,
      },
    });
    return;
  }

  async deleteAll(userId: string) {
    await this.txHost.tx.notification.deleteMany({
      where: {
        userId,
      },
    });
    return;
  }

  async readOne(userId: string, notificationId: string) {
    await this.txHost.tx.notification.updateMany({
      where: {
        userId,
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });
    return;
  }

  async deleteOne(userId: string, notificationId: string) {
    await this.txHost.tx.notification.deleteMany({
      where: {
        userId,
        id: notificationId,
      },
    });
    return;
  }
}
