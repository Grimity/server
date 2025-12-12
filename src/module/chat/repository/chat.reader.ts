import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { sql } from 'kysely';

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

  async findUsersStatusByChatId(chatId: string) {
    return await this.txHost.tx.chatUser.findMany({
      where: {
        chatId,
      },
    });
  }

  async findUsersByChatId(chatId: string) {
    const result = await this.txHost.tx.$kysely
      .selectFrom('ChatUser')
      .where('ChatUser.chatId', '=', kyselyUuid(chatId))
      .select([
        'ChatUser.enteredAt',
        'ChatUser.exitedAt',
        'ChatUser.unreadCount',
      ])
      .innerJoin('User', 'ChatUser.userId', 'User.id')
      .select([
        'User.id as userId',
        'User.name as userName',
        'User.image as userImage',
        'User.url as userUrl',
      ])
      .execute();

    return result.map((user) => ({
      id: user.userId,
      name: user.userName,
      image: user.userImage,
      url: user.userUrl,
      enteredAt: user.enteredAt,
      exitedAt: user.exitedAt,
      unreadCount: user.unreadCount,
    }));
  }

  async findOpponentUserByChatId(userId: string, chatId: string) {
    const result = await this.txHost.tx.$kysely
      .selectFrom('ChatUser')
      .where('ChatUser.chatId', '=', kyselyUuid(chatId))
      .where('ChatUser.userId', '!=', kyselyUuid(userId))
      .innerJoin('User', 'ChatUser.userId', 'User.id')
      .select([
        'User.id as id',
        'User.name as name',
        'User.image as image',
        'User.url as url',
      ])
      .select((eb) =>
        eb
          .fn<boolean>('EXISTS', [
            eb
              .selectFrom('Block')
              .where('Block.blockingId', '=', kyselyUuid(userId))
              .whereRef('Block.blockerId', '=', 'User.id'),
          ])
          .as('isBlocked'),
      )
      .select((eb) =>
        eb
          .fn<boolean>('EXISTS', [
            eb
              .selectFrom('Block')
              .where('Block.blockerId', '=', kyselyUuid(userId))
              .whereRef('Block.blockingId', '=', 'User.id'),
          ])
          .as('isBlocking'),
      )
      .executeTakeFirst();

    if (!result) return null;
    return {
      id: result.id,
      name: result.name,
      image: result.image,
      url: result.url,
      isBlocked: result.isBlocked,
      isBlocking: result.isBlocking,
    };
  }

  async findMessageById(id: string) {
    return await this.txHost.tx.chatMessage.findUnique({
      where: { id },
    });
  }

  async findManyByUsernameWithCursor({
    userId,
    size,
    cursor,
    name,
  }: {
    userId: string;
    size: number;
    cursor: string | null;
    name: string | null;
  }) {
    const chats = await this.txHost.tx.$kysely
      .selectFrom('ChatUser')
      .where('ChatUser.userId', '=', kyselyUuid(userId))
      .where('ChatUser.enteredAt', 'is not', null)
      .innerJoin('ChatUser as opponentUser', (join) =>
        join
          .onRef('ChatUser.chatId', '=', 'opponentUser.chatId')
          .on('opponentUser.userId', '!=', kyselyUuid(userId)),
      )
      .innerJoinLateral(
        (eb) =>
          eb
            .selectFrom('ChatMessage')
            .whereRef('ChatMessage.chatId', '=', 'ChatUser.chatId')
            .select([
              'ChatMessage.id',
              'ChatMessage.userId',
              'ChatMessage.content',
              'ChatMessage.image',
              'ChatMessage.createdAt',
            ])
            .orderBy('ChatMessage.createdAt', 'desc')
            .limit(1)
            .as('LastMessage'),
        (join) => join.on((eb) => eb.lit(true)),
      )
      .innerJoin('User', 'opponentUser.userId', 'User.id')
      .$if(!!name, (eb) => eb.where('User.name', 'like', `%${name}%`))
      .select([
        'ChatUser.chatId as id',
        'ChatUser.unreadCount',
        'ChatUser.enteredAt',
        'LastMessage.id as lastMessageId',
        'LastMessage.content as lastMessageContent',
        'LastMessage.image as lastMessageImage',
        'LastMessage.createdAt as lastMessageCreatedAt',
        'LastMessage.userId as lastMessageUserId',
        'User.id as opponentId',
        'User.name as opponentName',
        'User.image as opponentImage',
        'User.url as opponentUrl',
      ])
      .orderBy('LastMessage.createdAt', 'desc')
      .orderBy('ChatUser.chatId', 'desc')
      .$if(!!cursor, (eb) =>
        eb.where((eb) =>
          eb.or([
            eb('LastMessage.createdAt', '<', new Date(cursor!.split('_')[0])),
            eb.and([
              eb('LastMessage.createdAt', '=', new Date(cursor!.split('_')[0])),
              eb('ChatUser.chatId', '<', kyselyUuid(cursor!.split('_')[1])),
            ]),
          ]),
        ),
      )
      .limit(size)
      .execute();

    return {
      nextCursor:
        chats.length === size
          ? `${chats[size - 1].lastMessageCreatedAt.toISOString()}_${chats[size - 1].id}`
          : null,
      chats: chats.map((chat) => ({
        id: chat.id,
        unreadCount: chat.unreadCount,
        enteredAt: chat.enteredAt!,
        lastMessage: {
          id: chat.lastMessageId,
          content: chat.lastMessageContent,
          image: chat.lastMessageImage,
          createdAt: chat.lastMessageCreatedAt,
          senderId: chat.lastMessageUserId,
        },
        opponentUser: {
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
    exitedAt,
  }: {
    chatId: string;
    size: number;
    cursor: string | null;
    exitedAt: Date | null;
  }) {
    const messages = await this.txHost.tx.$kysely
      .selectFrom('ChatMessage')
      .where('ChatMessage.chatId', '=', kyselyUuid(chatId))
      .$if(exitedAt !== null, (eb) => {
        return eb.where('ChatMessage.createdAt', '>', exitedAt);
      })
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
        'ChatMessage.replyToId',
        'replyMessage.id',
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
