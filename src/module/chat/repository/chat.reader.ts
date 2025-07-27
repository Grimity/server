import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { kyselyUuid } from 'src/shared/util/convert-uuid';

@Injectable()
export class ChatReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findOneByUserIds(userIds: string[]) {
    const result = await this.txHost.tx.chatUser.groupBy({
      by: ['chatId'],
      where: {
        userId: {
          in: userIds,
        },
      },
      having: {
        chatId: {
          _count: {
            equals: 2,
          },
        },
      },
      take: 1,
      orderBy: {
        chatId: 'desc',
      },
    });
    return result[0]?.chatId;
  }

  async findOneStatusById(userId: string, chatId: string) {
    return await this.txHost.tx.chatUser.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });
  }

  async findUsersByChatId(chatId: string) {
    return await this.txHost.tx.chatUser.findMany({
      where: {
        chatId,
      },
    });
  }

  async findMessageById(id: string) {
    return await this.txHost.tx.chatMessage.findUnique({
      where: { id },
    });
  }

  async findByUsernameWithCursor(
    userId: string,
    cursor: string | null,
    size: number,
    username?: string,
  ) {
    const chats = await this.txHost.tx.$kysely
      .selectFrom('ChatUser')
      .where('ChatUser.userId', '=', kyselyUuid(userId))
      .innerJoin('Chat', 'ChatUser.chatId', 'Chat.id')
      .$if(cursor !== null, (eb) => {
        const [lastCreatedAt, lastId] = cursor!.split('_');
        return eb.where((eb) =>
          eb.and([
            eb('Chat.createdAt', '<=', new Date(lastCreatedAt)),
            eb('Chat.id', '!=', kyselyUuid(lastId)),
          ]),
        );
      })
      .innerJoin('ChatMessage', 'Chat.id', 'ChatMessage.chatId')
      .leftJoin('User as Opponent', 'ChatMessage.replyToId', 'Opponent.id')
      .select([
        'Chat.id as id',
        'Chat.createdAt as createdAt',
        'ChatMessage.id as messageId',
        'ChatMessage.content as messageContent',
        'ChatMessage.image as messageImage',
        'ChatMessage.createdAt as messageCreatedAt',
        'ChatMessage.isLike as messageIsLike',
        'ChatUser.unreadCount as unreadCount',
        'Opponent.id as opponentId',
        'Opponent.name as opponentName',
        'Opponent.image as opponentImage',
        'Opponent.url as opponentUrl',
      ])
      .$if(username !== null, (eb) =>
        eb.where('Opponent.name', 'like', `%${username}%`),
      )
      .orderBy('Chat.createdAt', 'desc')
      .orderBy('ChatMessage.createdAt', 'desc')
      .limit(size)
      .execute();

    return {
      nextCursor:
        chats.length === size
          ? `${chats[size - 1].createdAt.toISOString()}_${chats[size - 1].id}`
          : null,
      chats: chats.map((chat) => ({
        id: chat.id,
        unreadCount: chat.unreadCount,
        createdAt: chat.createdAt,
        lastMessage: {
          id: chat.messageId,
          content: chat.messageContent,
          image: chat.messageImage,
          createdAt: chat.messageCreatedAt,
        },
        opponent: {
          id: chat.opponentId,
          name: chat.opponentName,
          image: chat.opponentImage,
          url: chat.opponentUrl,
        },
      })),
    };
  }

  async findManyMessagesByCursor({
    chatId,
    size,
    cursor,
  }: {
    chatId: string;
    size: number;
    cursor: string | null;
  }) {
    const messages = await this.txHost.tx.$kysely
      .selectFrom('ChatMessage')
      .where('ChatMessage.chatId', '=', kyselyUuid(chatId))
      .$if(cursor !== null, (eb) => {
        const [lastCreatedAt, lastId] = cursor!.split('_');

        return eb.where((eb) =>
          eb.or([
            eb('ChatMessage.createdAt', '<', new Date(lastCreatedAt)),
            eb.and([
              eb('ChatMessage.createdAt', '=', new Date(lastCreatedAt)),
              eb('ChatMessage.id', '<', kyselyUuid(lastId)),
            ]),
          ]),
        );
      })
      .select([
        'ChatMessage.content',
        'ChatMessage.createdAt',
        'ChatMessage.id',
        'ChatMessage.image',
        'ChatMessage.isLike',
      ])
      .leftJoin(
        'ChatMessage as replyMessage',
        'ChatMessage.chatId',
        'replyMessage.replyToId',
      )
      .select([
        'replyMessage.id as replyId',
        'replyMessage.content as replyContent',
        'replyMessage.createdAt as replyCreatedAt',
        'replyMessage.image as replyImage',
      ])
      .innerJoin('User', 'ChatMessage.userId', 'User.id')
      .select([
        'User.id as userId',
        'User.url as userUrl',
        'User.name as userName',
        'User.image as userImage',
      ])
      .orderBy('ChatMessage.createdAt', 'desc')
      .orderBy('ChatMessage.id', 'desc')
      .limit(size)
      .execute();

    return {
      nextCursor:
        messages.length === size
          ? `${messages[size - 1].createdAt.toISOString()}_${messages[size - 1].id}`
          : null,
      messages: messages.map((message) => ({
        id: message.id,
        content: message.content,
        image: message.image,
        createdAt: message.createdAt,
        isLike: message.isLike,
        user: {
          id: message.userId,
          image: message.userImage,
          name: message.userName,
          url: message.userUrl,
        },
        replyTo: message.replyId
          ? {
              id: message.replyId,
              content: message.replyContent,
              createdAt: message.replyCreatedAt!,
              image: message.replyImage,
            }
          : null,
      })),
    };
  }
}
