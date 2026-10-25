import {
  HttpException,
  Logger,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type {
  DefaultEventsMap,
  Namespace,
  RemoteSocket,
  Socket,
} from 'socket.io';
import { RedisService } from 'src/database/redis/redis.service';
import { BoardTokenService } from './board-token.service';
import { BoardService } from './board.service';
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
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  BoardSocketData
>;
type BoardSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  BoardSocketData
>;
type BoardRemoteSocket = RemoteSocket<DefaultEventsMap, BoardSocketData>;

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

      client.emit('boardMembers', { members: this.toMembers(sockets) });

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
        client.to(room).emit('boardMemberJoined', member);
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
      this.server.to(room).emit('boardMemberLeft', { id: member.id });
    } catch (e) {
      this.logger.error(
        `Error in handleDisconnect for client ${client.id}:`,
        e,
      );
    }
  }

  onModuleDestroy() {
    // 서버가 꺼질 때 끊기는 소켓은 다른 서버에 다시 연결하므로 퇴장을 알리지 않는다.
    this.closing = true;
  }

  async onApplicationShutdown() {
    // adapter는 socket.io 서버가 닫힐 때 구독을 해제하므로 그 뒤에 연결을 끊는다.
    await this.subRedis.quit();
  }

  private async authenticate(socket: BoardSocket) {
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
      return Object.assign(new Error(e.message), {
        data: { statusCode: e.getStatus() },
      });
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
