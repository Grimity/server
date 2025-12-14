import { Injectable, HttpException } from '@nestjs/common';
import { ChatReader } from './repository/chat.reader';
import { ChatWriter } from './repository/chat.writer';
import { UserReader } from '../user/repository/user.reader';
import { RedisService } from 'src/database/redis/redis.service';
import { TypedRedisPublisher } from 'src/database/redis/typed-redis-publisher';
import { getImageUrl } from 'src/shared/util/get-image-url';

@Injectable()
export class ChatService {
  private redisClient;

  constructor(
    private readonly chatReader: ChatReader,
    private readonly chatWriter: ChatWriter,
    private readonly userReader: UserReader,
    private readonly redisService: RedisService,
    private readonly redisPublisher: TypedRedisPublisher,
  ) {
    this.redisClient = this.redisService.pubClient;
  }

  async createChat(userId: string, targetUserId: string) {
    const userExists = await this.userReader.findOneById(targetUserId);
    if (!userExists) throw new HttpException('USER', 404);

    const chatId = await this.chatReader.findOneByUserIds([
      userId,
      targetUserId,
    ]);

    if (chatId) {
      const chatStatus = await this.chatReader.findOneStatusById(
        userId,
        chatId,
      );
      if (chatStatus === null) throw new HttpException('CHAT', 404);

      if (chatStatus.enteredAt) return { id: chatId };
      else {
        const { chatId: id } = await this.chatWriter.enterChat(userId, chatId);
        return { id };
      }
    }

    return await this.chatWriter.createChat(userId, targetUserId);
  }

  async getChats({
    userId,
    size,
    cursor,
    keyword,
  }: {
    userId: string;
    size: number;
    cursor: string | null;
    keyword: string | null;
  }) {
    const result = await this.chatReader.findManyByUsernameWithCursor({
      userId,
      size,
      cursor,
      name: keyword,
    });

    return {
      nextCursor: result.nextCursor,
      chats: result.chats.map((chat) => ({
        ...chat,
        lastMessage:
          chat.lastMessage.createdAt > chat.enteredAt
            ? {
                ...chat.lastMessage,
                image: getImageUrl(chat.lastMessage.image),
              }
            : null,
        opponentUser: {
          ...chat.opponentUser,
          image: getImageUrl(chat.opponentUser.image),
        },
      })),
    };
  }

  async joinChat({ userId, chatId }: { userId: string; chatId: string }) {
    const chat = await this.chatReader.findOneStatusById(userId, chatId);

    if (!chat) throw new HttpException('CHAT', 404);

    await this.chatWriter.updateChatUser({ userId, chatId, unreadCount: 0 });

    await this.redisClient.sadd(`user:${userId}:online:chats`, chatId);
    await this.redisClient.expire(`user:${userId}:online:chats`, 60 * 60); // TTL 1시간
    return;
  }

  async leaveChat({ userId, chatId }: { userId: string; chatId: string }) {
    await this.redisClient.srem(`user:${userId}:online:chats`, chatId);
    return;
  }

  async deleteChat(userId: string, chatId: string) {
    const chatUsers = await this.chatReader.findUsersStatusByChatId(chatId);

    const me = chatUsers.find((status) => status.userId === userId);
    const opponent = chatUsers.find((status) => status.userId !== userId);

    if (!me || !opponent) throw new HttpException('CHAT', 404);

    if (opponent.enteredAt === null) {
      // 찐 삭제
      await this.chatWriter.deleteChat(chatId);
    } else {
      await this.chatWriter.updateChatUser({
        userId,
        chatId,
        unreadCount: 0,
        enteredAt: null,
        exitedAt: new Date(),
      });
    }

    this.redisPublisher.publish(`user:${userId}`, 'deleteChat', {
      chatIds: [chatId],
    });
  }

  async deleteChats(userId: string, chatIds: string[]) {
    await this.chatWriter.exitManyChats(userId, chatIds);
    this.redisPublisher.publish(`user:${userId}`, 'deleteChat', { chatIds });
    return;
  }

  async getOpponentUser(userId: string, chatId: string) {
    const opponentUser = await this.chatReader.findOpponentUserByChatId(
      userId,
      chatId,
    );

    if (!opponentUser) throw new HttpException('CHAT', 404);

    return {
      ...opponentUser,
      image: getImageUrl(opponentUser.image),
    };
  }
}
