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

  async createMessageByContent(input: {
    userId: string;
    chatId: string;
    content: string;
    replyToId: string | null;
  }) {
    return await this.txHost.tx.chatMessage.create({
      data: input,
    });
  }

  async createMessageByImages({
    userId,
    chatId,
    images,
    replyToId,
  }: {
    userId: string;
    chatId: string;
    images: string[];
    replyToId: string | null;
  }) {
    await this.txHost.tx.chatMessage.createMany({
      data: images.map((image) => {
        return {
          chatId,
          userId,
          image,
          replyToId,
        };
      }),
    });
  }

  async updateMessageLike(messageId: string, like: boolean) {
    await this.txHost.tx.chatMessage.update({
      where: { id: messageId },
      data: {
        isLike: like,
      },
    });
  }
}
