import {
  HttpException,
  Logger,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Namespace, RemoteSocket, Socket } from 'socket.io';
import { RedisService } from 'src/database/redis/redis.service';
import { BoardTokenService } from './board-token.service';
import { BoardService } from './board.service';
import {
  BOARD_PROTOCOL_VERSION,
  MIN_BOARD_PROTOCOL_VERSION,
  type BoardAck,
  type BoardAckError,
  type BoardClientEvents,
  type BoardServerEvents,
} from './board.protocol';
import type {
  BoardMemberResponse,
  BoardPermission,
} from './dto/board.response';

type BoardSocketData = {
  boardId: string;
  permission: BoardPermission;
  member: BoardMemberResponse;
  connectedAt: number;
};

type BoardNamespace = Namespace<
  BoardClientEvents,
  BoardServerEvents,
  Record<string, never>,
  BoardSocketData
>;
type BoardSocket = Socket<
  BoardClientEvents,
  BoardServerEvents,
  Record<string, never>,
  BoardSocketData
>;
type BoardRemoteSocket = RemoteSocket<BoardServerEvents, BoardSocketData>;

const boardRoom = (boardId: string) => `board:${boardId}`;

// 연결 시각이 같으면 소켓 ID로 순서를 정해 모든 서버가 같은 순서로 판단하게 한다.
const isEarlier = (a: BoardRemoteSocket, b: BoardRemoteSocket) =>
  a.data.connectedAt < b.data.connectedAt ||
  (a.data.connectedAt === b.data.connectedAt && a.id < b.id);

@WebSocketGateway({ namespace: '/boards', cors: { origin: '*' } })
export class BoardGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy,
    OnApplicationShutdown
{
  @WebSocketServer()
  server: BoardNamespace;

  private readonly logger = new Logger(BoardGateway.name);
  private subRedis: Redis;
  private closing = false;

  constructor(
    private readonly boardService: BoardService,
    private readonly boardToken: BoardTokenService,
    private readonly redisService: RedisService,
  ) {}

  afterInit(namespace: BoardNamespace) {
    // Redis adapter는 보드 네임스페이스에만 붙인다. 서버 전체에 붙이면
    // 커스텀 pub/sub으로 서버마다 전달하는 채팅·알림이 한 번 더 전달되고,
    // 전역 게이트웨이의 disconnectSockets가 다른 서버의 연결까지 끊는다.
    // 구독 연결은 RedisService.subClient와 따로 둔다. 그 연결은 모든 메시지를 JSON으로 읽는다.
    this.subRedis = this.redisService.pubClient.duplicate();
    namespace.adapter = createAdapter(
      this.redisService.pubClient,
      this.subRedis,
    )(namespace);

    // 미들웨어에서 거절해야 클라이언트가 connect_error로 받는다.
    namespace.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        (e) => next(this.toConnectError(e)),
      );
    });
  }

  async handleConnection(client: BoardSocket) {
    const { boardId, member } = client.data;
    const room = boardRoom(boardId);
    try {
      await client.join(room);
      const sockets = await this.fetchSockets(room);
      // 조회하는 동안 끊겼으면 퇴장 처리에 맡긴다.
      if (!client.connected) return;

      client.emit('hello', {
        protocol: BOARD_PROTOCOL_VERSION,
        serverTime: Date.now(),
        self: { memberId: member.id, permission: client.data.permission },
        members: this.toMembers(sockets),
        limits: {},
      });

      // 탭이 여러 개여도 한 명이다. 같은 참여자의 소켓 중 가장 먼저 연결한 소켓만 입장을 알린다.
      // 서로 다른 서버에서 동시에 연결하면 두 번 알릴 수 있으므로 클라이언트는 id로 덮어쓴다.
      const self = sockets.find((socket) => socket.id === client.id);
      const isFirst =
        !self ||
        !sockets.some(
          (socket) =>
            socket.data.member.id === member.id && isEarlier(socket, self),
        );
      if (isFirst) {
        client.to(room).emit('members:joined', { member });
      }
    } catch (e) {
      this.logger.error(
        `Error in handleConnection for client ${client.id}:`,
        e,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: BoardSocket) {
    // 방은 socket.io가 정리한다. 여기서는 마지막 소켓이 끊겼을 때만 퇴장을 알린다.
    if (this.closing || !client.data?.member) return;
    const { boardId, member } = client.data;
    const room = boardRoom(boardId);
    try {
      const sockets = await this.fetchSockets(room);
      if (sockets.some((socket) => socket.data.member.id === member.id)) {
        return;
      }
      this.server.to(room).emit('members:left', { memberId: member.id });
    } catch (e) {
      this.logger.error(
        `Error in handleDisconnect for client ${client.id}:`,
        e,
      );
    }
  }

  /** 접속자 목록 다시 받기. 서버가 비정상 종료돼 퇴장 알림이 빠졌을 때 화면을 바로잡는다. */
  @SubscribeMessage('members:sync')
  async syncMembers(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() payload: unknown,
  ): Promise<BoardAck<{ members: BoardMemberResponse[] }>> {
    return this.respond(payload, async () => {
      const sockets = await this.fetchSockets(boardRoom(client.data.boardId));
      return { members: this.toMembers(sockets) };
    });
  }

  onModuleDestroy() {
    // 서버가 꺼질 때 끊기는 소켓은 다른 서버에 다시 연결하므로 퇴장을 알리지 않는다.
    this.closing = true;
  }

  async onApplicationShutdown() {
    // adapter는 socket.io 서버가 닫힐 때 구독을 해제하므로 그 뒤에 연결을 끊는다.
    await this.subRedis.quit();
  }

  /**
   * 요청 처리 공통 틀. 본문은 객체여야 하고(필드를 늘릴 수 있게), 실패하면 예외 대신 ack 에러로 돌려준다.
   * 쓰기 요청은 handler 안에서 client.data.permission을 확인한다.
   */
  private async respond<T>(
    payload: unknown,
    handler: () => Promise<T>,
  ): Promise<BoardAck<T>> {
    if (
      payload !== undefined &&
      (payload === null ||
        typeof payload !== 'object' ||
        Array.isArray(payload))
    ) {
      return this.ackError({ code: 'BAD_REQUEST', retryable: false });
    }
    try {
      return { ok: true, data: await handler() };
    } catch (e) {
      if (e instanceof HttpException && e.getStatus() === 403) {
        return this.ackError({ code: 'FORBIDDEN', retryable: false });
      }
      this.logger.error('Error in board socket request:', e);
      return this.ackError({ code: 'INTERNAL', retryable: true });
    }
  }

  private ackError(error: BoardAckError): { ok: false; error: BoardAckError } {
    return { ok: false, error };
  }

  private async authenticate(socket: BoardSocket) {
    // 규약이 맞지 않으면 토큰보다 먼저 거절한다. 클라이언트는 새로고침하거나(낮으면) 잠시 뒤 다시 붙는다(높으면).
    const protocol: unknown = socket.handshake.auth?.protocol;
    if (
      typeof protocol !== 'number' ||
      !Number.isInteger(protocol) ||
      protocol < MIN_BOARD_PROTOCOL_VERSION ||
      protocol > BOARD_PROTOCOL_VERSION
    ) {
      throw new HttpException('PROTOCOL', 426);
    }
    // 토큰이 만료됐으면 거절한다. 클라이언트는 입장 API로 새 토큰을 받는다.
    const claims = this.boardToken.verify(socket.handshake.auth?.boardToken);
    if (!claims) {
      throw new HttpException('BOARD_TOKEN', 401);
    }
    const permission = await this.boardService.verifyConnection(claims);
    socket.data = {
      boardId: claims.boardId,
      permission,
      member: {
        id: claims.memberId,
        userId: claims.userId,
        type: claims.type,
        name: claims.name,
        image: claims.image,
      },
      connectedAt: Date.now(),
    };
  }

  private toConnectError(e: unknown) {
    if (e instanceof HttpException) {
      const data: Record<string, number> = { statusCode: e.getStatus() };
      if (e.message === 'PROTOCOL') {
        data.minProtocol = MIN_BOARD_PROTOCOL_VERSION;
        data.maxProtocol = BOARD_PROTOCOL_VERSION;
      }
      return Object.assign(new Error(e.message), { data });
    }
    this.logger.error('Error in board socket authentication:', e);
    return Object.assign(new Error('INTERNAL'), {
      data: { statusCode: 500 },
    });
  }

  private async fetchSockets(room: string) {
    try {
      return await this.server.in(room).fetchSockets();
    } catch (e) {
      // 응답하지 않는 서버가 있으면 이 서버의 소켓으로만 판단한다.
      this.logger.warn(`Failed to fetch sockets of ${room} from all servers`);
      return await this.server.local.in(room).fetchSockets();
    }
  }

  // 같은 참여자의 소켓은 하나로 합치고, 먼저 연결한 참여자부터 보낸다.
  private toMembers(sockets: BoardRemoteSocket[]): BoardMemberResponse[] {
    const firstSockets = new Map<string, BoardRemoteSocket>();
    for (const socket of sockets) {
      const first = firstSockets.get(socket.data.member.id);
      if (!first || isEarlier(socket, first)) {
        firstSockets.set(socket.data.member.id, socket);
      }
    }
    return [...firstSockets.values()]
      .sort((a, b) => (isEarlier(a, b) ? -1 : isEarlier(b, a) ? 1 : 0))
      .map((socket) => socket.data.member);
  }
}
