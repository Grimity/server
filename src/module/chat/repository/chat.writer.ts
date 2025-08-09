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

  async createMessages(
    messages: {
      userId: string;
      content: string | null;
      chatId: string;
      replyToId: string | null;
      image?: string | null;
    }[],
  ) {
    const createdAt = new Date();
    return await this.txHost.tx.chatMessage.createManyAndReturn({
      data: messages.map((message, i) => ({
        ...message,
        createdAt: new Date(createdAt.getTime() + i),
      })),
      select: {
        id: true,
        content: true,
        image: true,
        createdAt: true,
      },
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

  async deleteChat(chatId: string) {
    await this.txHost.tx.chat.delete({
      where: {
        id: chatId,
      },
    });
    return;
  }

  async updateChatUser({
    userId,
    chatId,
    ...data
  }: {
    userId: string;
    chatId: string;
    unreadCount?: number;
    enteredAt?: Date | null;
    exitedAt?: Date | null;
  }) {
    await this.txHost.tx.chatUser.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data,
    });
  }

  async increaseUnreadCount({
    userId,
    chatId,
    count,
  }: {
    userId: string;
    chatId: string;
    count: number;
  }) {
    const result = await this.txHost.tx.chatUser.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        unreadCount: {
          increment: count,
        },
      },
      select: {
        unreadCount: true,
      },
    });
    return result.unreadCount;
  }

  async exitManyChats(userId: string, chatIds: string[]) {
    await this.txHost.tx.chatUser.updateMany({
      where: {
        userId,
        chatId: {
          in: chatIds,
        },
      },
      data: {
        enteredAt: null,
        exitedAt: new Date(),
        unreadCount: 0,
      },
    });
    return;
  }
}
