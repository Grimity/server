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
