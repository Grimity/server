import type {
  BoardMemberResponse,
  BoardPermission,
} from './dto/board.response';

/**
 * 보드 소켓(/boards) 규약. 설명과 바꾸는 규칙은 docs/board-socket.md.
 * 프론트(grimity-board src/features/board/realtime/protocol.ts)가 같은 타입을 복사해 쓴다. 바꾸면 같이 고친다.
 */

/** 이 서버가 말하는 규약 버전 */
export const BOARD_PROTOCOL_VERSION = 1;
/** 이 서버가 받아 주는 가장 낮은 클라이언트 규약. 호환되지 않게 바꾸면 올린다. */
export const MIN_BOARD_PROTOCOL_VERSION = 1;

/** 연결을 거절할 때 connect_error의 message */
export type BoardConnectErrorCode =
  | 'PROTOCOL'
  | 'BOARD_TOKEN'
  | 'BOARD'
  | 'BOARD_MEMBER'
  | 'BOARD_ACCESS'
  | 'BOARD_FULL'
  | 'INTERNAL';

/** 요청(ack)이 실패했을 때의 code */
export type BoardAckErrorCode =
  | 'BAD_REQUEST'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export interface BoardAckError {
  code: BoardAckErrorCode;
  /** 같은 요청을 다시 보내도 되는지 */
  retryable: boolean;
  message?: string;
}

/** 클라이언트 요청의 응답. 저장이 필요한 요청은 모두 ack로 결과를 돌려준다. */
export type BoardAck<T> =
  | { ok: true; data: T }
  | { ok: false; error: BoardAckError };

/** 서버가 정하고 검사하는 제한값. 클라이언트는 hello.limits로 받는다. */
export interface BoardLimits {
  /** 동시 참여 인원. 같은 참여자의 탭 여러 개는 한 명으로 센다. */
  maxMembers: number;
  /** 획 하나의 최대 점 개수. 넘으면 클라이언트가 이어지는 새 획으로 나눈다. */
  maxPointsPerStroke: number;
  /** 획 하나의 points를 JSON으로 만든 길이 */
  maxStrokeBytes: number;
  /** stroke:preview 한 번에 보내는 최대 점 개수 */
  maxPointsPerMessage: number;
  /** stroke:preview를 보내는 간격 */
  previewIntervalMs: number;
  /** 소켓 하나가 1초에 보낼 수 있는 메시지 수 */
  maxMessagesPerSecond: number;
  /** x, y의 절댓값 */
  maxCoordinate: number;
  /** 브러시 지름 */
  maxStrokeSize: number;
}

/** 연결 직후 서버가 보내는 보드 상태 */
export interface BoardHello {
  protocol: number;
  /** 서버 시각(ms). 클라이언트 시계 차이 보정용 */
  serverTime: number;
  self: { memberId: string; permission: BoardPermission; isOwner: boolean };
  /** 지금 접속 중인 참여자. 나 포함, 먼저 들어온 순 */
  members: BoardMemberResponse[];
  /** 서버가 정하는 제한값. 키가 없으면 제한 없음. 모르는 키는 무시한다. */
  limits: Partial<BoardLimits> & Record<string, number | undefined>;
  /** 이 시점의 마지막 변경 순서. 스냅샷·sinceSeq와 이어 맞출 때 쓴다. */
  seq: number;
}

export type BoardStrokeTool = 'pen' | 'eraser';
export type BoardEraseScope = 'own' | 'all';

/** 클라이언트가 보내는 획. 작성자와 순서는 서버가 정한다. */
export interface BoardStrokeInput {
  /** 획 스키마 버전 */
  v: number;
  /** 클라이언트가 만든 UUID */
  id: string;
  tool: BoardStrokeTool;
  brush: { id: string; version: number };
  /** #rrggbb */
  color: string;
  size: number;
  eraseScope: BoardEraseScope;
  /** points 한 점의 값 순서. x, y는 필수 */
  channels: string[];
  /** channels 길이 × 점 개수만큼의 숫자 */
  points: number[];
}

/** 저장된 획 */
export interface BoardStroke extends BoardStrokeInput {
  seq: number;
  /** BoardMember.id */
  authorId: string;
}

/**
 * 그리는 중인 획. 저장하지 않고 방에 흘려보낸다.
 * index는 이 메시지의 첫 점이 획에서 몇 번째인지다. cancel이면 그리기를 취소한 것이다.
 */
export interface BoardStrokePreviewInput extends BoardStrokeInput {
  index: number;
  cancel?: boolean;
}

export interface BoardStrokePreview extends BoardStrokePreviewInput {
  authorId: string;
}

/**
 * 그림 결과를 바꾼 변경 하나. seq 순서대로 적용한다.
 * 종류를 이벤트로 나누지 않고 type으로 구분한다. 모르는 type도 seq는 진행해야 빈 번호로 오해하지 않는다.
 */
export type BoardChange =
  | { seq: number; type: 'stroke'; stroke: BoardStroke }
  | {
      seq: number;
      type: 'hide';
      opId: string;
      authorId: string;
      strokeId: string;
    }
  /** 숨겼던 획은 스냅샷에 없을 수 있어 획 전체를 함께 보낸다. */
  | {
      seq: number;
      type: 'show';
      opId: string;
      authorId: string;
      stroke: BoardStroke;
    }
  /** authorId의 획 중 seq보다 앞선 펜 획·own 지우개를 지운다. */
  | { seq: number; type: 'clear'; opId: string; authorId: string }
  /** 게스트를 계정에 합쳤다. from의 획은 이제 to의 획이다. */
  | { seq: number; type: 'merge'; opId: string; from: string; to: string };

export type BoardStrokesSyncResult =
  | {
      changes: BoardChange[];
      /** 여기까지 적용한 것으로 본다. 탈퇴·삭제로 빈 번호가 있어도 진행한다. */
      upToSeq: number;
      hasMore: boolean;
    }
  /** 너무 오래됐다. 스냅샷부터 다시 받는다. */
  | { reset: true };

export interface BoardServerEvents {
  hello: (payload: BoardHello) => void;
  'members:joined': (payload: { member: BoardMemberResponse }) => void;
  'members:left': (payload: { memberId: string }) => void;
  'board:changed': (payload: BoardChange) => void;
  'stroke:preview': (payload: BoardStrokePreview) => void;
}

export interface BoardClientEvents {
  /** 접속자 목록을 다시 받는다. 탭으로 돌아왔을 때 등 */
  'members:sync': (
    payload: Record<string, never>,
    ack: (result: BoardAck<{ members: BoardMemberResponse[] }>) => void,
  ) => void;
  'stroke:commit': (
    payload: { stroke: BoardStrokeInput },
    ack: (result: BoardAck<{ seq: number }>) => void,
  ) => void;
  /** 이미 그 상태면 seq는 null이다(순서를 쓰지 않는다). */
  'stroke:hide': (
    payload: { opId: string; strokeId: string },
    ack: (result: BoardAck<{ seq: number | null }>) => void,
  ) => void;
  'stroke:show': (
    payload: { opId: string; strokeId: string },
    ack: (result: BoardAck<{ seq: number | null }>) => void,
  ) => void;
  'stroke:clear': (
    payload: { opId: string },
    ack: (result: BoardAck<{ seq: number }>) => void,
  ) => void;
  /** sinceSeq 다음부터의 변경을 받는다. hasMore면 upToSeq로 다시 부른다. */
  'strokes:sync': (
    payload: { sinceSeq: number },
    ack: (result: BoardAck<BoardStrokesSyncResult>) => void,
  ) => void;
  'stroke:preview': (payload: BoardStrokePreviewInput) => void;
}
