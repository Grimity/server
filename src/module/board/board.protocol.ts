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
  | 'INTERNAL';

/** 요청(ack)이 실패했을 때의 code */
export type BoardAckErrorCode = 'BAD_REQUEST' | 'FORBIDDEN' | 'INTERNAL';

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

/** 연결 직후 서버가 보내는 보드 상태 */
export interface BoardHello {
  protocol: number;
  /** 서버 시각(ms). 클라이언트 시계 차이 보정용 */
  serverTime: number;
  self: { memberId: string; permission: BoardPermission };
  /** 지금 접속 중인 참여자. 나 포함, 먼저 들어온 순 */
  members: BoardMemberResponse[];
  /** 서버가 정하는 제한값. 키가 없으면 제한 없음. 획 동기화 때 채운다(docs/board-socket.md). */
  limits: Record<string, number>;
}

export interface BoardServerEvents {
  hello: (payload: BoardHello) => void;
  'members:joined': (payload: { member: BoardMemberResponse }) => void;
  'members:left': (payload: { memberId: string }) => void;
}

export interface BoardClientEvents {
  /** 접속자 목록을 다시 받는다. 탭으로 돌아왔을 때 등 */
  'members:sync': (
    payload: Record<string, never>,
    ack: (result: BoardAck<{ members: BoardMemberResponse[] }>) => void,
  ) => void;
}
