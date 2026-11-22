import { HttpException, Injectable } from '@nestjs/common';
import {
  BoardEraseScope as DbEraseScope,
  BoardOpType,
  BoardStrokeTool as DbStrokeTool,
  Prisma,
} from '@prisma/client';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import type { BoardStroke, BoardStrokeInput } from '../board.protocol';

const strokeSelect = {
  id: true,
  seq: true,
  authorId: true,
  v: true,
  tool: true,
  eraseScope: true,
  brushId: true,
  brushVersion: true,
  color: true,
  size: true,
  channels: true,
  points: true,
} satisfies Prisma.BoardStrokeSelect;

type StrokeRow = Prisma.BoardStrokeGetPayload<{ select: typeof strokeSelect }>;

export type BoardOpRow = {
  seq: number;
  id: string;
  type: BoardOpType;
  authorId: string;
  strokeId: string | null;
  data: unknown;
};

const toStroke = (row: StrokeRow): BoardStroke => ({
  v: row.v,
  id: row.id,
  seq: row.seq,
  authorId: row.authorId,
  tool: row.tool === DbStrokeTool.PEN ? 'pen' : 'eraser',
  brush: { id: row.brushId, version: row.brushVersion },
  color: row.color,
  size: row.size,
  eraseScope: row.eraseScope === DbEraseScope.ALL ? 'all' : 'own',
  channels: row.channels,
  points: row.points as number[],
});

/** 획과 변경 기록의 저장소. 순서(seq)를 매기는 쓰기는 모두 lockBoard 뒤, 같은 트랜잭션에서 한다. */
@Injectable()
export class BoardStrokeRepository {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {}

  /**
   * 보드 행을 잠그고 마지막 seq를 읽는다. 커밋할 때까지 같은 보드의 쓰기가 줄을 서므로
   * seq는 빈 번호 없이 커밋 순서대로 매겨진다. 서버가 여러 대여도 DB 한 곳에서 정해진다.
   */
  async lockBoard(boardId: string): Promise<number> {
    const rows = await this.txHost.tx.$queryRaw<{ lastSeq: number }[]>`
      SELECT "lastSeq" FROM "Board" WHERE "id" = ${boardId}::uuid FOR UPDATE
    `;
    const row = rows[0];
    if (!row) throw new HttpException('BOARD', 404);
    return row.lastSeq;
  }

  async setLastSeq(boardId: string, lastSeq: number) {
    await this.txHost.tx.$executeRaw`
      UPDATE "Board" SET "lastSeq" = ${lastSeq} WHERE "id" = ${boardId}::uuid
    `;
  }

  async getLastSeq(boardId: string): Promise<number> {
    const board = await this.txHost.tx.board.findUnique({
      where: { id: boardId },
      select: { lastSeq: true },
    });
    return board?.lastSeq ?? 0;
  }

  async findStrokeMeta(boardId: string, id: string) {
    return await this.txHost.tx.boardStroke.findUnique({
      where: { boardId_id: { boardId, id } },
      select: { seq: true, authorId: true, hiddenBySeq: true },
    });
  }

  async findStroke(boardId: string, id: string): Promise<BoardStroke | null> {
    const row = await this.txHost.tx.boardStroke.findUnique({
      where: { boardId_id: { boardId, id } },
      select: strokeSelect,
    });
    return row && toStroke(row);
  }

  async createStroke(
    boardId: string,
    seq: number,
    authorId: string,
    stroke: BoardStrokeInput,
  ) {
    await this.txHost.tx.boardStroke.create({
      data: {
        boardId,
        id: stroke.id,
        seq,
        authorId,
        v: stroke.v,
        tool: stroke.tool === 'pen' ? DbStrokeTool.PEN : DbStrokeTool.ERASER,
        eraseScope:
          stroke.eraseScope === 'all' ? DbEraseScope.ALL : DbEraseScope.OWN,
        brushId: stroke.brush.id,
        brushVersion: stroke.brush.version,
        color: stroke.color,
        size: stroke.size,
        channels: stroke.channels,
        points: stroke.points,
      },
      select: { id: true },
    });
  }

  async setHiddenBySeq(
    boardId: string,
    id: string,
    hiddenBySeq: number | null,
  ) {
    await this.txHost.tx.boardStroke.update({
      where: { boardId_id: { boardId, id } },
      data: { hiddenBySeq },
      select: { id: true },
    });
  }

  /** 전체 지우기: 내 펜 획과 내 지우개(own)를 숨긴다. 소유자 지우개(all)는 남의 그림에도 적용돼 있어 남긴다. */
  async hideAllOf(boardId: string, authorId: string, seq: number) {
    await this.txHost.tx.boardStroke.updateMany({
      where: {
        boardId,
        authorId,
        hiddenBySeq: null,
        seq: { lt: seq },
        OR: [{ tool: DbStrokeTool.PEN }, { eraseScope: DbEraseScope.OWN }],
      },
      data: { hiddenBySeq: seq },
    });
  }

  /** seq 이후에 작성자가 전체 지우기를 했는지. 전체 지우기로 지운 획은 되돌릴 수 없다. */
  async hasClearAfter(boardId: string, authorId: string, seq: number) {
    const op = await this.txHost.tx.boardOp.findFirst({
      where: { boardId, authorId, type: BoardOpType.CLEAR, seq: { gt: seq } },
      select: { seq: true },
    });
    return op !== null;
  }

  async findOpById(boardId: string, id: string): Promise<BoardOpRow | null> {
    return await this.txHost.tx.boardOp.findUnique({
      where: { boardId_id: { boardId, id } },
      select: {
        seq: true,
        id: true,
        type: true,
        authorId: true,
        strokeId: true,
        data: true,
      },
    });
  }

  async createOp(
    boardId: string,
    op: {
      seq: number;
      id: string;
      type: BoardOpType;
      authorId: string;
      strokeId?: string;
      data?: Prisma.InputJsonValue;
    },
  ) {
    await this.txHost.tx.boardOp.create({
      data: { boardId, ...op },
      select: { seq: true },
    });
  }

  /** 지금 보이는 획을 seq 순으로 한 페이지 읽는다. */
  async findVisibleStrokes(
    boardId: string,
    afterSeq: number,
    take: number,
  ): Promise<BoardStroke[]> {
    const rows = await this.txHost.tx.boardStroke.findMany({
      where: { boardId, hiddenBySeq: null, seq: { gt: afterSeq } },
      orderBy: { seq: 'asc' },
      take,
      select: strokeSelect,
    });
    return rows.map(toStroke);
  }

  /** seq 다음에 추가된 획. 지금 숨겨져 있어도 재생을 위해 돌려준다. */
  async findStrokesAfter(
    boardId: string,
    afterSeq: number,
    take: number,
  ): Promise<BoardStroke[]> {
    const rows = await this.txHost.tx.boardStroke.findMany({
      where: { boardId, seq: { gt: afterSeq } },
      orderBy: { seq: 'asc' },
      take,
      select: strokeSelect,
    });
    return rows.map(toStroke);
  }

  async findOpsAfter(
    boardId: string,
    afterSeq: number,
    take: number,
  ): Promise<BoardOpRow[]> {
    return await this.txHost.tx.boardOp.findMany({
      where: { boardId, seq: { gt: afterSeq } },
      orderBy: { seq: 'asc' },
      take,
      select: {
        seq: true,
        id: true,
        type: true,
        authorId: true,
        strokeId: true,
        data: true,
      },
    });
  }

  async findStrokesByIds(
    boardId: string,
    ids: string[],
  ): Promise<BoardStroke[]> {
    if (ids.length === 0) return [];
    const rows = await this.txHost.tx.boardStroke.findMany({
      where: { boardId, id: { in: ids } },
      select: strokeSelect,
    });
    return rows.map(toStroke);
  }

  /** 합치기: 게스트의 획과 작업을 사용자 행으로 옮긴다. 이후 게스트 행을 지워도 그림이 남는다. */
  async moveAuthor(boardId: string, from: string, to: string) {
    await this.txHost.tx.boardStroke.updateMany({
      where: { boardId, authorId: from },
      data: { authorId: to },
    });
    await this.txHost.tx.boardOp.updateMany({
      where: { boardId, authorId: from },
      data: { authorId: to },
    });
  }
}
