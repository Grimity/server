import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class ChatWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async enterChat(userId: string, chatId: string) {
    return await this.txHost.tx.chatUser.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        enteredAt: new Date(),
      },
      select: { chatId: true },
    });
  }

  async createChat(userId: string, targetUserId: string) {
    return await this.txHost.tx.chat.create({
      data: {
        users: {
          createMany: {
            data: [
              {
                userId: userId,
                enteredAt: new Date(),
              },
              {
                userId: targetUserId,
              },
            ],
          },
        },
      },
      select: { id: true },
    });
  }
}
