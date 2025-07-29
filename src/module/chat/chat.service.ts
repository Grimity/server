import { Injectable, HttpException } from '@nestjs/common';
import { ChatReader } from './repository/chat.reader';
import { ChatWriter } from './repository/chat.writer';
import { UserSelectRepository } from '../user/repository/user.select.repository';
import { GlobalGateway } from '../websocket/global.gateway';

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
    }

    if (chatId) {
      const { chatId: id } = await this.chatWriter.enterChat(userId, chatId);
      return { id };
    } else {
      return await this.chatWriter.createChat(userId, targetUserId);
    }
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

    await this.chatWriter.resetUnreadCount(userId, chatId);

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
}
