import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
import { Prisma } from '@prisma/client';
import type { NotificationType } from 'src/common/constants';

@Injectable()
export class NotificationRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    await this.prisma.notification.create({
      data: input,
    });
  }

  async findAllByUserId(userId: string) {
    return await this.prisma.notification.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        actor: {
          select: {
            id: true,
            name: true,
          },
        },
        refId: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  async read(userId: string, notificationId: string) {
    try {
      await this.prisma.notification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
        },
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
}

export type CreateNotificationInput = {
  actorId: string;
  refId?: string | null;
  type: NotificationType;
  userId: string;
};
