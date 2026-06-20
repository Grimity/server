import { Injectable, HttpException } from '@nestjs/common';
import { ChatWriter } from './repository/chat.writer';
import { ChatReader } from './repository/chat.reader';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { UserReader } from '../user/repository/user.reader';
import { RedisService } from 'src/database/redis/redis.service';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import { TypedRedisPublisher } from 'src/database/redis/typed-redis-publisher';

@Injectable()
export class ChatMessageService {
  private redisClient;
  constructor(
    private readonly chatWriter: ChatWriter,
    private readonly chatReader: ChatReader,
    private readonly userReader: UserReader,
    private readonly redisService: RedisService,
    private readonly eventEmitter: TypedEventEmitter,
    private readonly redisPublisher: TypedRedisPublisher,
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

    const createdMessage = await this.chatWriter.createMessage({
      userId,
      chatId,
      content,
      images,
      replyToId,
    });

    let replyTo = null;

    if (replyToId) {
      replyTo = await this.chatReader.findMessageById(replyToId);
    }

    const result = await this.redisClient.sismember(
      `user:${targetUserStatus.userId}:online:chats`,
      chatId,
    );

    const targetUserJoinedChat = Number(result) === 1;

    const targetUserIsOnline = await this.redisService.isSubscribed(
      `user:${targetUserStatus.userId}`,
    );

    if (targetUserJoinedChat === false)
      await this.chatWriter.increaseUnreadCount({
        userId: targetUserStatus.userId,
        chatId,
        count: 1,
      });

    const chatUsers = await this.chatReader.findUsersByChatId(chatId);

    const newMessagePayload = {
      chatId,
      senderId: userId,
      chatUsers: chatUsers.map((user) => ({
        id: user.id,
        name: user.name,
        image: getImageUrl(user.image),
        url: user.url,
        unreadCount: user.unreadCount,
      })),
      messages: [
        {
          id: createdMessage.id,
          content: createdMessage.content,
          image: getImageUrl(createdMessage.image),
          images: createdMessage.images.map((image) => getImageUrl(image)),
          type: createdMessage.type,
          referenceId: createdMessage.referenceId,
          createdAt: createdMessage.createdAt,
          replyTo: replyTo
            ? {
                id: replyTo.id,
                content: replyTo.content,
                image: getImageUrl(replyTo.image),
                images: replyTo.images.length
                  ? replyTo.images.map((image) => getImageUrl(image))
                  : replyTo.image
                    ? [getImageUrl(replyTo.image)]
                    : [],
                createdAt: replyTo.createdAt,
              }
            : null,
        },
      ],
    };

    await this.redisPublisher.publish(
      `user:${userId}`,
      'newChatMessage',
      newMessagePayload,
    );

    const myInfo = chatUsers.find((user) => user.id === userId);
    if (!myInfo) throw new HttpException('USER', 404);

    if (targetUserIsOnline) {
      await this.redisPublisher.publish(
        `user:${targetUserStatus.userId}`,
        'newChatMessage',
        newMessagePayload,
      );
    }
    if (!targetUserJoinedChat) {
      this.eventEmitter.emit(`push`, {
        userId: targetUserStatus.userId,
        title: `${myInfo.name}`,
        text: createdMessage.content || `${myInfo.name}님이 사진을 보냈어요!`,
        imageUrl: getImageUrl(createdMessage.image),
        data: {
          event: 'newChatMessage',
          deepLink: `/chats/${chatId}`,
          data: JSON.stringify(newMessagePayload),
        },
        key: `chat-message-${chatId}`,
        badge: targetUserStatus.unreadCount + 1,
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

    await this.redisPublisher.publish(`user:${userId}`, 'likeChatMessage', {
      messageId,
    });
    await this.redisPublisher.publish(
      `user:${targetUser.id}`,
      'likeChatMessage',
      { messageId },
    );
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

    await this.redisPublisher.publish(`user:${userId}`, 'unlikeChatMessage', {
      messageId,
    });
    await this.redisPublisher.publish(
      `user:${targetUser.id}`,
      'unlikeChatMessage',
      { messageId },
    );
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
        images: message.images.map((image) => getImageUrl(image)),
        user: {
          ...message.user,
          image: getImageUrl(message.user.image),
        },
        replyTo: message.replyTo
          ? {
              ...message.replyTo,
              image: getImageUrl(message.replyTo.image),
              images: message.replyTo.images.map((image) => getImageUrl(image)),
            }
          : null,
      })),
    };
  }
}
