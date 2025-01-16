import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
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
}

export type CreateNotificationInput = {
  actorId: string;
  refId?: string | null;
  type: NotificationType;
  userId: string;
};
