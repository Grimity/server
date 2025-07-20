import { Injectable, HttpException } from '@nestjs/common';
import { ChatWriter } from './repository/chat.writer';
import { ChatReader } from './repository/chat.reader';

@Injectable()
export class ChatMessageService {
  constructor(
    private readonly chatWriter: ChatWriter,
    private readonly chatReader: ChatReader,
  ) {}

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
    const chatUsersStatus = await this.chatReader.findUsersByChatId(chatId);

    if (chatUsersStatus.length === 0) throw new HttpException('CHAT', 404);
    if (!chatUsersStatus.find((userStatus) => userStatus.userId === userId))
      throw new HttpException('내가 참여한 방이 아닙니다', 403);

    const targetUserStatus = chatUsersStatus.find(
      (userStatus) => userStatus.userId !== userId,
    );

    if (targetUserStatus?.enteredAt === null) {
      await this.chatWriter.enterChat(targetUserStatus.userId, chatId);
    }

    if (content) {
      await this.chatWriter.createMessageByContent({
        userId,
        content,
        chatId,
        replyToId,
      });
    }

    if (images.length >= 1) {
      await this.chatWriter.createMessageByImages({
        userId,
        chatId,
        images,
      });
    }

    return;
  }
}
