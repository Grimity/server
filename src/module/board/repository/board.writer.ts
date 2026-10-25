import { Injectable } from '@nestjs/common';
import { BoardMemberPermission, Prisma } from '@prisma/client';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { convertCode } from 'src/shared/util/convert-prisma-error-code';

const isUniqueConstraintError = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError &&
  convertCode(e.code) === 'UNIQUE_CONSTRAINT';

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

  async upsertUserMember(boardId: string, userId: string) {
    const where = { boardId_userId: { boardId, userId } };
    try {
      // 링크로 처음 들어온 사용자는 권한 없이 참여자로만 등록한다.
      return await this.txHost.tx.boardMember.upsert({
        where,
        create: { boardId, userId },
        update: {},
        select: { id: true },
      });
    } catch (e) {
      // 같은 사용자가 동시에 입장해 다른 요청이 먼저 만든 경우
      if (!isUniqueConstraintError(e)) throw e;
      return await this.txHost.tx.boardMember.findUniqueOrThrow({
        where,
        select: { id: true },
      });
    }
  }

  async createGuestMember(boardId: string, name: string) {
    try {
      return await this.txHost.tx.boardMember.create({
        data: { boardId, name },
        select: { id: true, name: true },
      });
    } catch (e) {
      // 같은 보드에 같은 이름이 있으면 호출한 쪽에서 다른 이름으로 다시 시도한다.
      if (isUniqueConstraintError(e)) return null;
      throw e;
    }
  }

  async convertGuestToUser(boardId: string, memberId: string, userId: string) {
    try {
      // 조건부 update라 같은 게스트를 두 계정이 동시에 가져가도 한쪽만 성공한다.
      const { count } = await this.txHost.tx.boardMember.updateMany({
        where: { id: memberId, boardId, userId: null },
        data: { userId, name: null },
      });
      return count === 1;
    } catch (e) {
      // 이 사용자의 행이 이미 있으면 바꿀 수 없다. 호출한 쪽에서 합친다.
      if (isUniqueConstraintError(e)) return false;
      throw e;
    }
  }

  async deleteGuestMember(boardId: string, memberId: string) {
    const { count } = await this.txHost.tx.boardMember.deleteMany({
      where: { id: memberId, boardId, userId: null },
    });
    return count === 1;
  }
}
