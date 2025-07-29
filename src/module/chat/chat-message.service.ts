import { Injectable, HttpException } from '@nestjs/common';
import { ChatWriter } from './repository/chat.writer';
import { ChatReader } from './repository/chat.reader';
import { getImageUrl } from 'src/shared/util/get-image-url';

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
    } else if (replyToId) {
      const image = images.shift()!;

      await this.chatWriter.createMessageByImages({
        userId,
        chatId,
        images: [image],
        replyToId,
      });
    }

    if (images.length >= 1) {
      await this.chatWriter.createMessageByImages({
        userId,
        chatId,
        images,
        replyToId: null,
      });
    }

    return;
  }

  async createLike(userId: string, messageId: string) {
    const message = await this.chatReader.findMessageById(messageId);

    if (!message) throw new HttpException('MESSAGE', 404);
    if (message.isLike) return;

    await this.chatWriter.updateMessageLike(messageId, true);
    return;
  }

  async deleteLike(userId: string, messageId: string) {
    const message = await this.chatReader.findMessageById(messageId);
    if (!message) throw new HttpException('MESSAGE', 404);
    if (message.isLike === false) return;

    await this.chatWriter.updateMessageLike(messageId, false);
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
