import { Injectable } from '@nestjs/common';
import { BoardMemberPermission } from '@prisma/client';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

@Injectable()
export class BoardWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  async create(userId: string) {
    // Nested write로 보드와 소유자 참여 정보를 원자적으로 생성한다.
    return await this.txHost.tx.board.create({
      data: {
        ownerId: userId,
        members: {
          create: { userId, permission: BoardMemberPermission.EDIT },
        },
      },
      select: { id: true },
    });
  }
}
