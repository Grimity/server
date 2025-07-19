import { Injectable, HttpException } from '@nestjs/common';
import { ChatReader } from './repository/chat.reader';
import { ChatWriter } from './repository/chat.writer';
import { UserSelectRepository } from '../user/repository/user.select.repository';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatReader: ChatReader,
    private readonly chatWriter: ChatWriter,
    private readonly userReader: UserSelectRepository,
  ) {}

  async createChat(userId: string, targetUserId: string) {
    const userExists = await this.userReader.findOneById(targetUserId);
    if (!userExists) throw new HttpException('USER', 404);

    const chatId = await this.chatReader.findOneByUserIds([
      userId,
      targetUserId,
    ]);

    if (chatId) {
      const { chatId: id } = await this.chatWriter.enterChat(userId, chatId);
      return { id };
    } else {
      return await this.chatWriter.createChat(userId, targetUserId);
    }
  }
}
