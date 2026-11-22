import { HttpException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { BoardOpType } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  BOARD_SNAPSHOT_PAGE_SIZE,
  BOARD_SYNC_MAX_BEHIND,
  BOARD_SYNC_PAGE_SIZE,
} from './board-limits';
import type {
  BoardChange,
  BoardStroke,
  BoardStrokeInput,
  BoardStrokesSyncResult,
} from './board.protocol';
import type { BoardSnapshotResponse } from './dto/board.response';
import {
  BoardStrokeRepository,
  type BoardOpRow,
} from './repository/board-stroke.repository';

/** change가 있으면 호출한 쪽에서 커밋 뒤에 방으로 보낸다. 재전송이면 이전과 같은 change를 다시 돌려준다. */
export type BoardWriteResult<S = number> = {
  seq: S;
  change: BoardChange | null;
};

const forbidden = () => new HttpException('FORBIDDEN', 403);
const badRequest = () => new HttpException('BAD_REQUEST', 400);

@Injectable()
export class BoardStrokeService {
  constructor(private readonly repository: BoardStrokeRepository) {}

  /**
   * 획 저장. 잠금 → 중복 확인 → seq 증가 순서라서 재전송으로 번호가 비지 않는다.
   * 첫 시도가 저장 뒤 방송 전에 실패했을 수 있으므로 재전송이면 change를 다시 돌려준다.
   */
  @Transactional()
  async commit(
    boardId: string,
    authorId: string,
    input: BoardStrokeInput,
  ): Promise<BoardWriteResult> {
    const lastSeq = await this.repository.lockBoard(boardId);
    const existing = await this.repository.findStrokeMeta(boardId, input.id);
    if (existing) {
      if (existing.authorId !== authorId) throw badRequest();
      return {
        seq: existing.seq,
        change: {
          seq: existing.seq,
          type: 'stroke',
          stroke: { ...input, seq: existing.seq, authorId },
        },
      };
    }

    const seq = lastSeq + 1;
    await this.repository.setLastSeq(boardId, seq);
    await this.repository.createStroke(boardId, seq, authorId, input);
    return {
      seq,
      change: { seq, type: 'stroke', stroke: { ...input, seq, authorId } },
    };
  }

  @Transactional()
  async hide(
    boardId: string,
    authorId: string,
    opId: string,
    strokeId: string,
  ): Promise<BoardWriteResult<number | null>> {
    const lastSeq = await this.repository.lockBoard(boardId);
    const previous = await this.replay(boardId, opId, authorId);
    if (previous) return previous;

    const stroke = await this.findOwnStroke(boardId, authorId, strokeId);
    if (stroke.hiddenBySeq !== null) return { seq: null, change: null };

    const seq = lastSeq + 1;
    await this.repository.setLastSeq(boardId, seq);
    await this.repository.createOp(boardId, {
      seq,
      id: opId,
      type: BoardOpType.HIDE,
      authorId,
      strokeId,
    });
    await this.repository.setHiddenBySeq(boardId, strokeId, seq);
    return { seq, change: { seq, type: 'hide', opId, authorId, strokeId } };
  }

  @Transactional()
  async show(
    boardId: string,
    authorId: string,
    opId: string,
    strokeId: string,
  ): Promise<BoardWriteResult<number | null>> {
    const lastSeq = await this.repository.lockBoard(boardId);
    const previous = await this.replay(boardId, opId, authorId);
    if (previous) return previous;

    const meta = await this.findOwnStroke(boardId, authorId, strokeId);
    if (meta.hiddenBySeq === null) return { seq: null, change: null };
    // 전체 지우기는 화면에서 되돌릴 수 없다(다른 탭의 다시 실행도 막는다).
    if (await this.repository.hasClearAfter(boardId, authorId, meta.seq)) {
      throw forbidden();
    }

    const seq = lastSeq + 1;
    await this.repository.setLastSeq(boardId, seq);
    await this.repository.createOp(boardId, {
      seq,
      id: opId,
      type: BoardOpType.SHOW,
      authorId,
      strokeId,
    });
    await this.repository.setHiddenBySeq(boardId, strokeId, null);
    const stroke = await this.repository.findStroke(boardId, strokeId);
    if (!stroke) throw badRequest();
    return { seq, change: { seq, type: 'show', opId, authorId, stroke } };
  }

  @Transactional()
  async clear(
    boardId: string,
    authorId: string,
    opId: string,
  ): Promise<BoardWriteResult> {
    const lastSeq = await this.repository.lockBoard(boardId);
    const previous = await this.replay(boardId, opId, authorId);
    if (previous?.seq != null)
      return { seq: previous.seq, change: previous.change };

    const seq = lastSeq + 1;
    await this.repository.setLastSeq(boardId, seq);
    await this.repository.createOp(boardId, {
      seq,
      id: opId,
      type: BoardOpType.CLEAR,
      authorId,
    });
    await this.repository.hideAllOf(boardId, authorId, seq);
    return { seq, change: { seq, type: 'clear', opId, authorId } };
  }

  async lock(boardId: string) {
    await this.repository.lockBoard(boardId);
  }

  /** 게스트를 사용자 행에 합친다. 호출한 쪽의 트랜잭션 안에서 게스트 행을 지우기 전에 부른다. */
  async merge(boardId: string, from: string, to: string): Promise<BoardChange> {
    const seq = (await this.repository.lockBoard(boardId)) + 1;
    await this.repository.setLastSeq(boardId, seq);
    await this.repository.moveAuthor(boardId, from, to);
    const opId = randomUUID();
    await this.repository.createOp(boardId, {
      seq,
      id: opId,
      type: BoardOpType.MERGE,
      authorId: to,
      data: { from, to },
    });
    return { seq, type: 'merge', opId, from, to };
  }

  async getLastSeq(boardId: string) {
    return await this.repository.getLastSeq(boardId);
  }

  /**
   * 스냅샷 한 페이지. 페이지 사이에 바뀐 것은 클라이언트가 첫 페이지의 lastSeq 이후 변경을 적용해 맞춘다.
   * 그래서 페이지마다 같은 시점을 볼 필요가 없고 긴 트랜잭션을 잡지 않는다.
   */
  async getSnapshot(
    boardId: string,
    cursor: number,
  ): Promise<BoardSnapshotResponse> {
    // 획보다 먼저 읽어야 lastSeq가 실제보다 앞서지 않는다(뒤처지면 변경을 한 번 더 적용할 뿐이다).
    const lastSeq = await this.repository.getLastSeq(boardId);
    const rows = await this.repository.findVisibleStrokes(
      boardId,
      cursor,
      BOARD_SNAPSHOT_PAGE_SIZE + 1,
    );
    const strokes = rows.slice(0, BOARD_SNAPSHOT_PAGE_SIZE);
    const last = strokes.at(-1);
    return {
      lastSeq,
      strokes,
      nextCursor:
        rows.length > BOARD_SNAPSHOT_PAGE_SIZE && last ? last.seq : null,
    };
  }

  async sync(
    boardId: string,
    sinceSeq: number,
  ): Promise<BoardStrokesSyncResult> {
    const lastSeq = await this.repository.getLastSeq(boardId);
    if (sinceSeq > lastSeq || lastSeq - sinceSeq > BOARD_SYNC_MAX_BEHIND) {
      return { reset: true };
    }

    const [strokes, ops] = await Promise.all([
      this.repository.findStrokesAfter(boardId, sinceSeq, BOARD_SYNC_PAGE_SIZE),
      this.repository.findOpsAfter(boardId, sinceSeq, BOARD_SYNC_PAGE_SIZE),
    ]);
    const shown = await this.repository.findStrokesByIds(
      boardId,
      ops.flatMap((op) =>
        op.type === BoardOpType.SHOW && op.strokeId ? [op.strokeId] : [],
      ),
    );
    const shownById = new Map(shown.map((stroke) => [stroke.id, stroke]));

    const merged = [
      ...strokes.map(
        (stroke): BoardChange => ({ seq: stroke.seq, type: 'stroke', stroke }),
      ),
      ...ops.flatMap((op) => {
        const change = this.toChange(op, shownById);
        return change ? [change] : [];
      }),
    ].sort((a, b) => a.seq - b.seq);

    const changes = merged.slice(0, BOARD_SYNC_PAGE_SIZE);
    // 두 목록을 합쳤으므로 한 페이지를 넘으면 뒤는 다음 요청으로 넘긴다.
    const hasMore =
      merged.length > BOARD_SYNC_PAGE_SIZE ||
      strokes.length === BOARD_SYNC_PAGE_SIZE ||
      ops.length === BOARD_SYNC_PAGE_SIZE;
    const last = changes.at(-1)?.seq ?? sinceSeq;
    return {
      changes,
      upToSeq: hasMore ? last : Math.max(lastSeq, last),
      hasMore,
    };
  }

  private async findOwnStroke(
    boardId: string,
    authorId: string,
    strokeId: string,
  ) {
    const stroke = await this.repository.findStrokeMeta(boardId, strokeId);
    if (!stroke) throw badRequest();
    if (stroke.authorId !== authorId) throw forbidden();
    return stroke;
  }

  /** 같은 ID의 작업이 이미 있으면 그 결과를 돌려준다. 다른 사람의 ID면 거절한다. */
  private async replay(
    boardId: string,
    opId: string,
    authorId: string,
  ): Promise<BoardWriteResult<number | null> | null> {
    const op = await this.repository.findOpById(boardId, opId);
    if (!op) return null;
    if (op.authorId !== authorId) throw badRequest();

    const shown = new Map<string, BoardStroke>();
    if (op.type === BoardOpType.SHOW && op.strokeId) {
      const stroke = await this.repository.findStroke(boardId, op.strokeId);
      if (stroke) shown.set(stroke.id, stroke);
    }
    return { seq: op.seq, change: this.toChange(op, shown) };
  }

  private toChange(
    op: BoardOpRow,
    strokes: Map<string, BoardStroke>,
  ): BoardChange | null {
    const base = { seq: op.seq, opId: op.id };
    switch (op.type) {
      case BoardOpType.HIDE:
        return op.strokeId
          ? {
              ...base,
              type: 'hide',
              authorId: op.authorId,
              strokeId: op.strokeId,
            }
          : null;
      case BoardOpType.SHOW: {
        const stroke = op.strokeId ? strokes.get(op.strokeId) : undefined;
        return stroke
          ? { ...base, type: 'show', authorId: op.authorId, stroke }
          : null;
      }
      case BoardOpType.CLEAR:
        return { ...base, type: 'clear', authorId: op.authorId };
      case BoardOpType.MERGE: {
        const { from, to } = op.data as { from: string; to: string };
        return { ...base, type: 'merge', from, to };
      }
    }
  }
}
