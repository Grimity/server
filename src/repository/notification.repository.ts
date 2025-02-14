import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';

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
        data: true,
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
    try {
      await this.prisma.notification.update({
        where: {
          userId,
          id: notificationId,
        },
        data: {
          isRead: true,
        },
        select: { id: true },
      });
      return;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new HttpException('NOTIFICATION', 404);
      }
      throw e;
    }
  }

  async hasUnread(userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        userId,
        isRead: false,
      },
    });
    return !!notification;
  }

  async deleteOne(userId: string, notificationId: string) {
    try {
      await this.prisma.notification.delete({
        where: {
          userId,
          id: notificationId,
        },
        select: { id: true },
      });
      return;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new HttpException('NOTIFICATION', 404);
      }
      throw e;
    }
  }
}
