import { Injectable, HttpException, Inject } from '@nestjs/common';
import { ChatReader } from './repository/chat.reader';
import { ChatWriter } from './repository/chat.writer';
import { UserSelectRepository } from '../user/repository/user.select.repository';
import { GlobalGateway } from '../websocket/global.gateway';
import { getImageUrl } from 'src/shared/util/get-image-url';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatReader: ChatReader,
    private readonly chatWriter: ChatWriter,
    private readonly userReader: UserSelectRepository,
    private readonly globalGateway: GlobalGateway,
  ) {}

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

  async search({
    userId,
    size,
    cursor,
    username,
  }: {
    userId: string;
    size: number;
    cursor?: string | null;
    username?: string | null;
  }) {
    const result = await this.chatReader.findManyByUsernameWithCursor(
      userId,
      size,
      cursor,
      username,
    );

    return {
      nextCursor: result.nextCursor,
      chats: result.chats.map((chat) => ({
        ...chat,
        lastMessage: {
          ...chat.lastMessage,
          image: getImageUrl(chat.lastMessage.image as string | null),
        },
        opponent: {
          id: chat.opponent.id,
          name: chat.opponent.name,
          image: getImageUrl(chat.opponent.image),
          url: chat.opponent.url,
        },
      })),
    };
  }

  async joinChat({
    userId,
    chatId,
    socketId,
  }: {
    userId: string;
    chatId: string;
    socketId: string;
  }) {
    const chat = await this.chatReader.findOneStatusById(userId, chatId);

    if (!chat) throw new HttpException('CHAT', 404);

    const socketUserId = await this.globalGateway.getUserIdByClientId(socketId);
    if (socketUserId === null || socketUserId !== userId)
      throw new HttpException('SOCKET', 404);

    await this.chatWriter.updateChatUser({ userId, chatId, unreadCount: 0 });

    this.globalGateway.joinChat(socketId, chatId);
    return;
  }

  async leaveChat({
    userId,
    chatId,
    socketId,
  }: {
    userId: string;
    chatId: string;
    socketId: string;
  }) {
    const socketUserId = await this.globalGateway.getUserIdByClientId(socketId);
    if (socketUserId === null || socketUserId !== userId)
      throw new HttpException('SOCKET', 404);

    this.globalGateway.leaveChat(socketId, chatId);
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
  }

  async deleteChats(userId: string, chatIds: string[]) {
    await this.chatWriter.exitManyChats(userId, chatIds);
    return;
  }
}
