import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    await this.prisma.notification.create({
      data: input,
    });
  }
}

export type CreateNotificationInput = {
  actorId: string;
  refId?: string | null;
  type: string;
  userId: string;
};
