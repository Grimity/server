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
import type { Socket } from 'socket.io';
import { RedisService } from 'src/database/redis/redis.service';
import { BOARD_STROKE_LIMITS } from './board-limits';
import {
  boardRoom,
  BoardRealtimeService,
  type BoardNamespace,
  type BoardRemoteSocket,
  type BoardSocketData,
} from './board-realtime.service';
import { BoardStrokeService } from './board-stroke.service';
import {
  assertUuid,
  validatePreview,
  validateStroke,
} from './board-stroke.validator';
import { BoardTokenService } from './board-token.service';
import { BoardService } from './board.service';
import {
  BOARD_PROTOCOL_VERSION,
  MIN_BOARD_PROTOCOL_VERSION,
  type BoardAck,
  type BoardAckError,
  type BoardChange,
  type BoardClientEvents,
  type BoardServerEvents,
  type BoardStrokesSyncResult,
} from './board.protocol';
import type { BoardMemberResponse } from './dto/board.response';

type BoardSocket = Socket<
  BoardClientEvents,
  BoardServerEvents,
  Record<string, never>,
  BoardSocketData
>;

// 연결 시각이 같으면 소켓 ID로 순서를 정해 모든 서버가 같은 순서로 판단하게 한다.
const isEarlier = (a: BoardRemoteSocket, b: BoardRemoteSocket) =>
  a.data.connectedAt < b.data.connectedAt ||
  (a.data.connectedAt === b.data.connectedAt && a.id < b.id);

/** 동시에 들어온 소켓이 모두 방에 들어올 때까지 기다리는 시간 */
const SEAT_CHECK_DELAY_MS = 300;

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
  // socket.data는 fetchSockets로 다른 서버에 전달되므로 서버 안에서만 쓰는 값은 따로 둔다.
  private readonly rates = new WeakMap<
    BoardSocket,
    { second: number; count: number }
  >();

  constructor(
    private readonly boardService: BoardService,
    private readonly boardStroke: BoardStrokeService,
    private readonly boardToken: BoardTokenService,
    private readonly redisService: RedisService,
    private readonly realtime: BoardRealtimeService,
  ) {}

  afterInit(namespace: BoardNamespace) {
    this.realtime.bind(namespace);
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
    const { boardId, member, isOwner, maxMembers } = client.data;
    const room = boardRoom(boardId);
    try {
      await client.join(room);
      // 방에 들어간 뒤에 읽어야 이 seq 이후의 변경을 놓치지 않는다.
      const [sockets, seq] = await Promise.all([
        this.realtime.fetchSockets(boardId),
        this.boardStroke.getLastSeq(boardId),
      ]);
      // 조회하는 동안 끊겼으면 퇴장 처리에 맡긴다.
      if (!client.connected) return;

      const members = this.toMembers(sockets);
      if (this.isOverCapacity(client, members)) {
        client.disconnect(true);
        return;
      }

      client.emit('hello', {
        protocol: BOARD_PROTOCOL_VERSION,
        serverTime: Date.now(),
        self: {
          memberId: member.id,
          permission: client.data.permission,
          isOwner,
        },
        members,
        limits: { ...BOARD_STROKE_LIMITS, maxMembers },
        seq,
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
      this.scheduleSeatCheck(client);
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
      const sockets = await this.realtime.fetchSockets(boardId);
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
      const sockets = await this.realtime.fetchSockets(client.data.boardId);
      return { members: this.toMembers(sockets) };
    });
  }

  /** 완성된 획 저장. 같은 획 ID로 다시 보내도 한 번만 반영한다. */
  @SubscribeMessage('stroke:commit')
  async commitStroke(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() payload: unknown,
  ): Promise<BoardAck<{ seq: number }>> {
    return this.respond(payload, async () => {
      this.assertWritable(client);
      const stroke = validateStroke((payload as { stroke?: unknown })?.stroke);
      // 모든 사람의 그림을 지우는 지우개는 소유자만 쓴다.
      if (stroke.eraseScope === 'all' && !client.data.isOwner) {
        throw new HttpException('FORBIDDEN', 403);
      }
      const { boardId, member } = client.data;
      return this.publish(
        boardId,
        await this.boardStroke.commit(boardId, member.id, stroke),
      );
    });
  }

  /** 내 획 숨기기(실행 취소) */
  @SubscribeMessage('stroke:hide')
  async hideStroke(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() payload: unknown,
  ): Promise<BoardAck<{ seq: number | null }>> {
    return this.respond(payload, async () => {
      this.assertWritable(client);
      const { opId, strokeId } = this.readStrokeOp(payload);
      const { boardId, member } = client.data;
      return this.publish(
        boardId,
        await this.boardStroke.hide(boardId, member.id, opId, strokeId),
      );
    });
  }

  /** 내 획 보이기(다시 실행) */
  @SubscribeMessage('stroke:show')
  async showStroke(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() payload: unknown,
  ): Promise<BoardAck<{ seq: number | null }>> {
    return this.respond(payload, async () => {
      this.assertWritable(client);
      const { opId, strokeId } = this.readStrokeOp(payload);
      const { boardId, member } = client.data;
      return this.publish(
        boardId,
        await this.boardStroke.show(boardId, member.id, opId, strokeId),
      );
    });
  }

  /** 내 획 모두 숨기기(전체 지우기) */
  @SubscribeMessage('stroke:clear')
  async clearStrokes(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() payload: unknown,
  ): Promise<BoardAck<{ seq: number }>> {
    return this.respond(payload, async () => {
      this.assertWritable(client);
      const opId = assertUuid((payload as { opId?: unknown })?.opId);
      const { boardId, member } = client.data;
      return this.publish(
        boardId,
        await this.boardStroke.clear(boardId, member.id, opId),
      );
    });
  }

  /** sinceSeq 다음부터의 변경 받기. 다시 연결했거나 빈 번호가 있을 때 부른다. */
  @SubscribeMessage('strokes:sync')
  async syncStrokes(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() payload: unknown,
  ): Promise<BoardAck<BoardStrokesSyncResult>> {
    return this.respond(payload, async () => {
      this.assertRate(client);
      const sinceSeq = (payload as { sinceSeq?: unknown })?.sinceSeq;
      if (
        typeof sinceSeq !== 'number' ||
        !Number.isInteger(sinceSeq) ||
        sinceSeq < 0
      ) {
        throw new HttpException('BAD_REQUEST', 400);
      }
      return await this.boardStroke.sync(client.data.boardId, sinceSeq);
    });
  }

  /** 그리는 중인 점을 방에 흘려보낸다. 저장하지 않고, 잘못됐거나 너무 잦으면 조용히 버린다. */
  @SubscribeMessage('stroke:preview')
  relayPreview(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() payload: unknown,
  ) {
    try {
      this.assertWritable(client);
      const preview = validatePreview(payload);
      if (preview.eraseScope === 'all' && !client.data.isOwner) return;
      client
        .to(boardRoom(client.data.boardId))
        .volatile.emit('stroke:preview', {
          ...preview,
          authorId: client.data.member.id,
        });
    } catch (e) {
      if (!(e instanceof HttpException)) {
        this.logger.error('Error in board stroke preview:', e);
      }
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
      if (e instanceof HttpException) {
        switch (e.getStatus()) {
          case 403:
            return this.ackError({ code: 'FORBIDDEN', retryable: false });
          case 429:
            return this.ackError({ code: 'RATE_LIMITED', retryable: true });
          case 400:
          case 404:
            return this.ackError({ code: 'BAD_REQUEST', retryable: false });
        }
      }
      this.logger.error('Error in board socket request:', e);
      return this.ackError({ code: 'INTERNAL', retryable: true });
    }
  }

  /** 커밋이 끝난 뒤에 방으로 보낸다. 재전송도 다시 보낸다(첫 시도가 방송 전에 실패했을 수 있다). */
  private publish<S>(
    boardId: string,
    { seq, change }: { seq: S; change: BoardChange | null },
  ): { seq: S } {
    if (change) this.realtime.emitChange(boardId, change);
    return { seq };
  }

  private readStrokeOp(payload: unknown) {
    const { opId, strokeId } = (payload ?? {}) as {
      opId?: unknown;
      strokeId?: unknown;
    };
    return { opId: assertUuid(opId), strokeId: assertUuid(strokeId) };
  }

  // 나중에 보기 전용 권한이 생겨도 뚫리지 않도록 쓰기 처리기마다 확인한다.
  private assertWritable(client: BoardSocket) {
    if (client.data.permission !== 'EDIT') {
      throw new HttpException('FORBIDDEN', 403);
    }
    this.assertRate(client);
  }

  // 소켓은 한 서버에만 붙으므로 서버 메모리로 센다.
  private assertRate(client: BoardSocket) {
    const second = Math.floor(Date.now() / 1000);
    const rate = this.rates.get(client);
    if (rate?.second !== second) {
      this.rates.set(client, { second, count: 1 });
      return;
    }
    rate.count += 1;
    if (rate.count > BOARD_STROKE_LIMITS.maxMessagesPerSecond) {
      throw new HttpException('RATE_LIMITED', 429);
    }
  }

  private ackError(error: BoardAckError): { ok: false; error: BoardAckError } {
    return { ok: false, error };
  }

  // 연결 때 확인했어도 여러 서버에서 동시에 들어오면 서로를 못 보고 넘칠 수 있다.
  // 모두 방에 들어온 뒤 한 번 더 세면 모든 서버가 같은 순서로 판단하므로 늦게 들어온 쪽이 나간다.
  // 끊긴 클라이언트는 다시 입장하다 BOARD_FULL을 받는다.
  private scheduleSeatCheck(client: BoardSocket) {
    const timer = setTimeout(() => {
      if (this.closing || !client.connected) return;
      this.realtime.fetchSockets(client.data.boardId).then(
        (sockets) => {
          if (
            client.connected &&
            this.isOverCapacity(client, this.toMembers(sockets))
          ) {
            client.disconnect(true);
          }
        },
        (e) => this.logger.error('Error in board seat check:', e),
      );
    }, SEAT_CHECK_DELAY_MS);
    timer.unref();
  }

  private isOverCapacity(
    client: BoardSocket,
    members: BoardMemberResponse[],
  ): boolean {
    const { isOwner, maxMembers, member } = client.data;
    return (
      !isOwner && members.findIndex(({ id }) => id === member.id) >= maxMembers
    );
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
    const { permission, isOwner, maxMembers } =
      await this.boardService.verifyConnection(claims);
    // 이미 접속 중인 참여자의 다른 탭은 한 명으로 센다. 소유자는 항상 들어올 수 있다.
    if (!isOwner) {
      const online = await this.realtime.onlineMemberIds(claims.boardId);
      if (!online.has(claims.memberId) && online.size >= maxMembers) {
        throw new HttpException('BOARD_FULL', 409);
      }
    }
    socket.data = {
      boardId: claims.boardId,
      permission,
      isOwner,
      maxMembers,
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
