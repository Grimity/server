import { Injectable, Logger } from '@nestjs/common';
import type { Namespace, RemoteSocket } from 'socket.io';
import type {
  BoardChange,
  BoardClientEvents,
  BoardServerEvents,
} from './board.protocol';
import type {
  BoardMemberResponse,
  BoardPermission,
} from './dto/board.response';

export type BoardSocketData = {
  boardId: string;
  permission: BoardPermission;
  isOwner: boolean;
  maxMembers: number;
  member: BoardMemberResponse;
  connectedAt: number;
};

export type BoardNamespace = Namespace<
  BoardClientEvents,
  BoardServerEvents,
  Record<string, never>,
  BoardSocketData
>;
export type BoardRemoteSocket = RemoteSocket<
  BoardServerEvents,
  BoardSocketData
>;

export const boardRoom = (boardId: string) => `board:${boardId}`;

/**
 * REST 쪽(입장 API)에서 소켓 상태를 쓰기 위한 통로.
 * 게이트웨이가 시작할 때 네임스페이스를 넘겨 준다. 게이트웨이 없이 도는 API 테스트에서는 접속자가 없는 것으로 본다.
 */
@Injectable()
export class BoardRealtimeService {
  private readonly logger = new Logger(BoardRealtimeService.name);
  private namespace: BoardNamespace | null = null;

  bind(namespace: BoardNamespace) {
    this.namespace = namespace;
  }

  async fetchSockets(boardId: string): Promise<BoardRemoteSocket[]> {
    if (!this.namespace) return [];
    const room = boardRoom(boardId);
    try {
      return await this.namespace.in(room).fetchSockets();
    } catch {
      // 응답하지 않는 서버가 있으면 이 서버의 소켓으로만 판단한다.
      this.logger.warn(`Failed to fetch sockets of ${room} from all servers`);
      return await this.namespace.local.in(room).fetchSockets();
    }
  }

  async onlineMemberIds(boardId: string): Promise<Set<string>> {
    const sockets = await this.fetchSockets(boardId);
    return new Set(sockets.map((socket) => socket.data.member.id));
  }

  emitChange(boardId: string, change: BoardChange) {
    this.namespace?.to(boardRoom(boardId)).emit('board:changed', change);
  }

  /** 합쳐져 사라진 참여자의 소켓을 끊는다. 클라이언트는 다시 입장해 새 신원을 받는다. */
  async disconnectMember(boardId: string, memberId: string) {
    const sockets = await this.fetchSockets(boardId);
    for (const socket of sockets) {
      if (socket.data.member.id === memberId) socket.disconnect(true);
    }
  }
}
