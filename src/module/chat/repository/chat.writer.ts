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

  async createMessage(input: {
    userId: string;
    chatId: string;
    content: string | null;
    images: string[];
    replyToId: string | null;
  }) {
    return await this.txHost.tx.chatMessage.create({
      data: {
        userId: input.userId,
        chatId: input.chatId,
        content: input.content,
        images: input.images,
        image: input.images[0] ?? null, // 호환용: 레거시 단일필드 + 채팅목록 미리보기 + 롤링배포 동안 구코드 호환
        replyToId: input.replyToId,
      },
      select: {
        id: true,
        content: true,
        image: true,
        images: true,
        createdAt: true,
      },
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
