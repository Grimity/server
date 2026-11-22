import type { BoardLimits } from './board.protocol';

export const DEFAULT_BOARD_MAX_MEMBERS = 5;

/**
 * 서버 보호용 제한값(docs/board-socket.md 5-4). 획 보관량에는 제한을 두지 않는다.
 * maxPointsPerStroke는 점 하나가 JSON으로 최대 44바이트라서 maxStrokeBytes를 넘지 않게 정했고,
 * maxStrokeBytes는 socket.io가 연결을 끊는 메시지 크기(1MB)보다 작다.
 */
export const BOARD_STROKE_LIMITS: Omit<BoardLimits, 'maxMembers'> = {
  maxPointsPerStroke: 11_000,
  maxStrokeBytes: 524_288,
  maxPointsPerMessage: 128,
  previewIntervalMs: 50,
  maxMessagesPerSecond: 60,
  maxCoordinate: 1_000_000,
  maxStrokeSize: 200,
};

/** 스냅샷 한 페이지의 획 개수 */
export const BOARD_SNAPSHOT_PAGE_SIZE = 200;
/** strokes:sync 한 번에 돌려주는 변경 개수 */
export const BOARD_SYNC_PAGE_SIZE = 200;
/** 이보다 많이 뒤처졌으면 변경을 재생하지 않고 스냅샷부터 다시 받게 한다. */
export const BOARD_SYNC_MAX_BEHIND = 2_000;
