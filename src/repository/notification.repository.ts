import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { convertCode } from './util/prisma-error-code';

@Injectable()
export class NotificationRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
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
    await this.prisma.notification.updateMany({
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
    await this.prisma.notification.deleteMany({
      where: {
        userId,
      },
    });
    return;
  }

  async readOne(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
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
    await this.prisma.notification.deleteMany({
      where: {
        userId,
        id: notificationId,
      },
    });
    return;
  }
}
