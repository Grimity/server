import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class BoardReader {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async findOneById(boardId: string) {
    return await this.txHost.tx.board.findUnique({
      where: { id: boardId },
      select: { id: true, title: true, ownerId: true, linkPermission: true },
    });
  }

  async findUserMember(boardId: string, userId: string) {
    return await this.txHost.tx.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { id: true, permission: true },
    });
  }

  async findMember(boardId: string, memberId: string) {
    return await this.txHost.tx.boardMember.findFirst({
      where: { id: memberId, boardId },
      select: { id: true, userId: true, permission: true },
    });
  }

  async findGuestMember(boardId: string, memberId: string) {
    return await this.txHost.tx.boardMember.findFirst({
      where: { id: memberId, boardId, userId: null },
      select: { id: true, name: true },
    });
  }

  async findUser(userId: string) {
    return await this.txHost.tx.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true },
    });
  }
}
