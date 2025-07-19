import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { kyselyUuid } from 'src/shared/util/convert-uuid';

@Injectable()
export class ChatReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findOneByUserIds(userIds: string[]) {
    const result = await this.txHost.tx.chatUser.groupBy({
      by: ['chatId'],
      where: {
        userId: {
          in: userIds,
        },
      },
      having: {
        chatId: {
          _count: {
            equals: 2,
          },
        },
      },
      take: 1,
      orderBy: {
        chatId: 'desc',
      },
    });
    return result[0]?.chatId;
  }

  async findOneStatusById(userId: string, chatId: string) {
    return await this.txHost.tx.chatUser.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });
  }
}
