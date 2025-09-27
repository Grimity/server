import { Injectable, HttpException } from '@nestjs/common';
import { ChatWriter } from './repository/chat.writer';
import { ChatReader } from './repository/chat.reader';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { UserReader } from '../user/repository/user.reader';
import { RedisService } from 'src/database/redis/redis.service';

@Injectable()
export class ChatMessageService {
  private redisClient;
  constructor(
    private readonly chatWriter: ChatWriter,
    private readonly chatReader: ChatReader,
    private readonly userReader: UserReader,
    private readonly redisService: RedisService,
  ) {
    this.redisClient = this.redisService.pubClient;
  }

  async create({
    userId,
    chatId,
    content,
    replyToId,
    images,
  }: {
    userId: string;
    chatId: string;
    content: string | null;
    replyToId: string | null;
    images: string[];
  }) {
    const chatUsersStatus =
      await this.chatReader.findUsersStatusByChatId(chatId);

    if (chatUsersStatus.length === 0) throw new HttpException('CHAT', 404);
    if (!chatUsersStatus.find((userStatus) => userStatus.userId === userId))
      throw new HttpException('내가 참여한 방이 아닙니다', 403);

    const targetUserStatus = chatUsersStatus.find(
      (userStatus) => userStatus.userId !== userId,
    );

    if (!targetUserStatus) throw new HttpException('USER', 404);

    if (targetUserStatus?.enteredAt === null) {
      await this.chatWriter.enterChat(targetUserStatus.userId, chatId);
    }

    const toCreateMessages = [];

    if (content) {
      toCreateMessages.push({
        userId,
        content,
        chatId,
        replyToId,
        image: null,
      });
    } else if (replyToId) {
      const image = images.shift()!;

      toCreateMessages.push({
        userId,
        content: null,
        chatId,
        replyToId: replyToId,
        image,
      });
    }

    if (images.length >= 1) {
      toCreateMessages.push(
        ...images.map((image) => ({
          userId,
          content: null,
          chatId,
          replyToId: null,
          image,
        })),
      );
    }

    const createdMessages =
      await this.chatWriter.createMessages(toCreateMessages);
    let replyTo = null;

    if (replyToId) {
      replyTo = await this.chatReader.findMessageById(replyToId);
    }

    const userInChatCount = await this.redisClient.get(
      `chat:${chatId}:user:${userId}:count`,
    );

    const targetUserIsOnline = await this.redisService.isSubscribed(
      `user:${targetUserStatus.userId}`,
    );

    let totalUnreadCount: number | null = null;

    if (userInChatCount === null || Number(userInChatCount) <= 0)
      //상대방이 오프라인이거나 온라인이어도 채팅방엔 없는상태
      totalUnreadCount = await this.chatWriter.increaseUnreadCount({
        userId: targetUserStatus.userId,
        chatId,
        count: toCreateMessages.length,
      });

    const chatUsers = await this.chatReader.findUsersByChatId(chatId);

    const newMessageEvent = {
      chatId,
      senderId: userId,
      chatUsers: chatUsers.map((user) => ({
        id: user.id,
        name: user.name,
        image: getImageUrl(user.image),
        url: user.url,
        unreadCount: user.unreadCount,
      })),
      messages: createdMessages.map((message, i) => ({
        id: message.id,
        content: message.content,
        image: getImageUrl(message.image),
        createdAt: message.createdAt,
        replyTo: replyTo
          ? i === 0
            ? {
                id: replyTo.id,
                content: replyTo.content,
                image: getImageUrl(replyTo.image),
                createdAt: replyTo.createdAt,
              }
            : null
          : null,
      })),
    };

    await this.redisService.publish(`user:${userId}`, {
      ...newMessageEvent,
      event: 'newChatMessage',
    });

    if (targetUserIsOnline === false) {
      // 푸시알림
    } else {
      // 상대방 온라인 상태임
      await this.redisService.publish(`user:${targetUserStatus.userId}`, {
        ...newMessageEvent,
        event: 'newChatMessage',
      });
    }

    return;
  }

  async createLike(userId: string, messageId: string) {
    const message = await this.chatReader.findMessageById(messageId);

    if (!message) throw new HttpException('MESSAGE', 404);
    if (message.isLike) return;

    const chatUsers = await this.chatReader.findUsersByChatId(message.chatId);
    const targetUser = chatUsers.find((user) => user.id !== userId);
    if (!targetUser) throw new HttpException('CHAT', 404);

    await this.chatWriter.updateMessageLike(messageId, true);

    await this.redisService.publish(`user:${message.userId}`, {
      messageId,
      event: 'likeChatMessage',
    });
    await this.redisService.publish(`user:${targetUser.id}`, {
      messageId,
      event: 'likeChatMessage',
    });
    return;
  }

  async deleteLike(userId: string, messageId: string) {
    const message = await this.chatReader.findMessageById(messageId);
    if (!message) throw new HttpException('MESSAGE', 404);
    if (message.isLike === false) return;

    const chatUsers = await this.chatReader.findUsersByChatId(message.chatId);
    const targetUser = chatUsers.find((user) => user.id !== userId);
    if (!targetUser) throw new HttpException('CHAT', 404);

    await this.chatWriter.updateMessageLike(messageId, false);

    await this.redisService.publish(`user:${message.userId}`, {
      messageId,
      event: 'unlikeChatMessage',
    });
    await this.redisService.publish(`user:${targetUser.id}`, {
      messageId,
      event: 'unlikeChatMessage',
    });
    return;
  }

  async getMessages({
    chatId,
    cursor,
    size,
    userId,
  }: {
    userId: string;
    chatId: string;
    cursor: string | null;
    size: number;
  }) {
    const chatStatus = await this.chatReader.findOneStatusById(userId, chatId);
    if (chatStatus === null || chatStatus.enteredAt === null)
      throw new HttpException('CHAT', 404);

    const result = await this.chatReader.findManyMessagesByCursor({
      chatId,
      cursor,
      size,
      exitedAt: chatStatus.exitedAt,
    });

    return {
      nextCursor: result.nextCursor,
      messages: result.messages.map((message) => ({
        ...message,
        image: getImageUrl(message.image),
        user: {
          ...message.user,
          image: getImageUrl(message.user.image),
        },
        replyTo: message.replyTo
          ? {
              ...message.replyTo,
              image: getImageUrl(message.replyTo.image),
            }
          : null,
      })),
    };
  }
}
