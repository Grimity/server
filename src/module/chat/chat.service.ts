import { Injectable, HttpException } from '@nestjs/common';
import { ChatReader } from './repository/chat.reader';
import { ChatWriter } from './repository/chat.writer';
import { UserReader } from '../user/repository/user.reader';
import { GlobalGateway } from '../websocket/global.gateway';
import { getImageUrl } from 'src/shared/util/get-image-url';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatReader: ChatReader,
    private readonly chatWriter: ChatWriter,
    private readonly userReader: UserReader,
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

    await this.globalGateway.joinChat(socketId, chatId);
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

    this.globalGateway.emitDeleteChatEventToUser(userId, [chatId]);
  }

  async deleteChats(userId: string, chatIds: string[]) {
    await this.chatWriter.exitManyChats(userId, chatIds);
    this.globalGateway.emitDeleteChatEventToUser(userId, chatIds);
    return;
  }

  async getOpponentUser(userId: string, chatId: string) {
    const chatUsers = await this.chatReader.findUsersByChatId(chatId);

    const opponentUser = chatUsers.filter((user) => user.id !== userId)[0];
    return {
      ...opponentUser,
      image: getImageUrl(opponentUser.image),
    };
  }
}
