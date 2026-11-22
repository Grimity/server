import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { createHmac, randomUUID } from 'crypto';
import { ClsModule } from 'nestjs-cls';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { globalPipe } from 'src/core/pipe/global.pipe';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import { WebSessionService } from 'src/module/auth/web-session.service';
import { BoardGatewayModule } from 'src/module/board/board-gateway.module';
import type {
  BoardChange,
  BoardHello,
  BoardStrokeInput,
  BoardStrokePreview,
} from 'src/module/board/board.protocol';

/**
 * 획 동기화. 서버 두 대를 실제 Redis와 실제 Postgres에 붙여 확인한다.
 * 테스트마다 자기 사용자·보드만 만들고 끝나면 그것만 지운다. 다른 데이터는 건드리지 않는다.
 */
describe('보드 획 동기화', () => {
  const apps: INestApplication[] = [];
  const redisServices: RedisService[] = [];
  const urls: string[] = [];
  const sockets: Socket[] = [];
  const createdUsers: string[] = [];
  const jwtSecret = 'board-test-secret';
  const boardSecret = createHmac('sha256', jwtSecret)
    .update('grimity:board:v1')
    .digest('hex');
  const jwt = new JwtService({ secret: jwtSecret });
  const authenticateRequest = jest.fn();
  const readCookie = jest.fn();
  let prisma: PrismaService;

  type Member = {
    id: string;
    userId: string | null;
    type: 'USER' | 'GUEST';
    name: string;
    image: null;
  };
  type Ack<T> =
    | { ok: true; data: T }
    | { ok: false; error: { code: string; retryable: boolean } };
  type SyncResult =
    | { changes: BoardChange[]; upToSeq: number; hasMore: boolean }
    | { reset: true };

  const createUser = async () => {
    const id = randomUUID();
    createdUsers.push(id);
    await prisma.user.create({
      data: {
        id,
        url: `board_${id}`,
        provider: 'test',
        providerId: id,
        email: `${id}@test.local`,
        name: id.slice(0, 20),
      },
    });
    return id;
  };

  const createBoard = async (data: { maxMembers?: number } = {}) => {
    const ownerUserId = await createUser();
    const board = await prisma.board.create({
      data: { ownerId: ownerUserId, ...data },
    });
    const member = await prisma.boardMember.create({
      data: { boardId: board.id, userId: ownerUserId, permission: 'EDIT' },
    });
    const owner: Member = {
      id: member.id,
      userId: ownerUserId,
      type: 'USER',
      name: '보드주인',
      image: null,
    };
    return { boardId: board.id, owner };
  };

  const createGuest = async (boardId: string): Promise<Member> => {
    const name = `게스트 ${randomUUID().slice(0, 8)}`;
    const member = await prisma.boardMember.create({
      data: { boardId, name },
    });
    return { id: member.id, userId: null, type: 'GUEST', name, image: null };
  };

  const createUserMember = async (boardId: string): Promise<Member> => {
    const userId = await createUser();
    const member = await prisma.boardMember.create({
      data: { boardId, userId },
    });
    return { id: member.id, userId, type: 'USER', name: '참여자', image: null };
  };

  const tokenOf = (boardId: string, member: Member) =>
    jwt.sign(
      {
        purpose: 'board',
        boardId,
        memberId: member.id,
        userId: member.userId,
        type: member.type,
        name: member.name,
        image: member.image,
        permission: 'EDIT',
      },
      { secret: boardSecret, algorithm: 'HS256', expiresIn: 60 * 60 },
    );

  const connect = async (boardId: string, member: Member, server = 0) => {
    const socket = io(urls[server], {
      auth: { boardToken: tokenOf(boardId, member), protocol: 1 },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    sockets.push(socket);
    const changes: BoardChange[] = [];
    const previews: BoardStrokePreview[] = [];
    socket.on('board:changed', (change: BoardChange) => changes.push(change));
    socket.on('stroke:preview', (preview: BoardStrokePreview) =>
      previews.push(preview),
    );
    const hello = await new Promise<BoardHello>((resolve, reject) => {
      socket.once('hello', resolve);
      socket.once('connect_error', reject);
    });
    return { socket, hello, changes, previews };
  };

  const until = async (check: () => boolean, ms = 3000) => {
    const deadline = Date.now() + ms;
    while (!check()) {
      if (Date.now() > deadline) throw new Error('조건을 기다리다 시간 초과');
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };

  const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

  const send = <T>(socket: Socket, event: string, payload: unknown) =>
    socket.timeout(5000).emitWithAck(event, payload) as Promise<Ack<T>>;

  const makeStroke = (
    patch: Partial<BoardStrokeInput> = {},
  ): BoardStrokeInput => ({
    v: 1,
    id: randomUUID(),
    tool: 'pen',
    brush: { id: 'round', version: 1 },
    color: '#35373c',
    size: 12,
    eraseScope: 'own',
    channels: ['x', 'y', 'pressure', 't', 'tiltX', 'tiltY'],
    points: [0, 0, 1, 0, 0, 0, 10.25, -3.5, 0.5, 16, 10, -5],
    ...patch,
  });

  const commit = (socket: Socket, stroke: BoardStrokeInput) =>
    send<{ seq: number }>(socket, 'stroke:commit', { stroke });

  const seqOf = <T>(ack: Ack<T>) => {
    if (!ack.ok) throw new Error(`요청 실패: ${ack.error.code}`);
    return (ack.data as { seq: number }).seq;
  };

  const snapshot = (boardId: string, member: Member, cursor?: number) =>
    request(apps[0].getHttpServer())
      .get(`/boards/${boardId}/snapshot`)
      .query(cursor === undefined ? {} : { cursor })
      .set('x-board-token', tokenOf(boardId, member));

  const createApp = async () => {
    const redisService = new RedisService(
      {
        get: (key: string) =>
          key === 'REDIS_HOST'
            ? (process.env.REDIS_HOST ?? 'localhost')
            : undefined,
      } as ConfigService,
      { emit: jest.fn() } as unknown as TypedEventEmitter,
    );
    redisServices.push(redisService);
    const module = await Test.createTestingModule({
      imports: [
        PrismaModule,
        ClsModule.forRoot({
          global: true,
          plugins: [
            new ClsPluginTransactional({
              imports: [PrismaModule],
              adapter: new TransactionalAdapterPrisma({
                prismaInjectionToken: PrismaService,
              }),
            }),
          ],
        }),
        BoardGatewayModule,
      ],
      providers: [globalPipe],
    })
      .useMocker((token) => {
        if (token === JwtService) return jwt;
        if (token === ConfigService) {
          return { getOrThrow: () => jwtSecret, get: () => undefined };
        }
        if (token === RedisService) return redisService;
        if (token === WebSessionService) {
          return { authenticateRequest, readCookie };
        }
      })
      .compile();
    const app = module.createNestApplication();
    await app.listen(0);
    apps.push(app);
    prisma = module.get(PrismaService);
    urls.push(`${await app.getUrl()}/boards`.replace('[::1]', 'localhost'));
  };

  beforeAll(async () => {
    process.env.IMAGE_URL = 'https://image.test';
    await createApp();
    await createApp();
  });

  beforeEach(() => {
    authenticateRequest.mockReset();
    readCookie.mockReset();
    authenticateRequest.mockRejectedValue(new UnauthorizedException());
  });

  afterEach(async () => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
    await settle();
  });

  afterAll(async () => {
    // 소유자를 지우면 보드·참여자·획이 함께 지워진다.
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    for (const app of apps) await app.close();
    for (const redisService of redisServices) {
      for (const client of [redisService.pubClient, redisService.subClient]) {
        if (client.status !== 'end') await client.quit();
      }
    }
  });

  describe('저장과 순서', () => {
    it('획을 저장하고 다른 서버의 참여자에게 seq와 함께 전달한다', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner, 0);
      const b = await connect(boardId, guest, 1);
      expect(a.hello.seq).toBe(0);
      expect(a.hello.self.isOwner).toBe(true);
      expect(b.hello.self.isOwner).toBe(false);

      const stroke = makeStroke();
      const ack = await commit(a.socket, stroke);

      expect(ack).toEqual({ ok: true, data: { seq: 1 } });
      await until(() => b.changes.length === 1 && a.changes.length === 1);
      expect(b.changes[0]).toEqual({
        seq: 1,
        type: 'stroke',
        stroke: { ...stroke, seq: 1, authorId: owner.id },
      });

      const row = await prisma.boardStroke.findUniqueOrThrow({
        where: { boardId_id: { boardId, id: stroke.id } },
      });
      expect(row.points).toEqual(stroke.points);
      expect(row.authorId).toBe(owner.id);
      const reconnected = await connect(boardId, guest, 0);
      expect(reconnected.hello.seq).toBe(1);
    });

    it('두 서버에서 동시에 저장해도 seq가 빈 번호 없이 매겨진다', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner, 0);
      const b = await connect(boardId, guest, 1);

      const acks = await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          commit(i % 2 ? a.socket : b.socket, makeStroke()),
        ),
      );

      const seqs = acks.map(seqOf).sort((x, y) => x - y);
      expect(seqs).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
      const board = await prisma.board.findUniqueOrThrow({
        where: { id: boardId },
      });
      expect(board.lastSeq).toBe(30);
    });

    it('같은 획 ID를 다시 보내면 한 번만 저장하고 같은 seq를 돌려준다', async () => {
      const { boardId, owner } = await createBoard();
      const a = await connect(boardId, owner);
      const stroke = makeStroke();

      const [first, second] = await Promise.all([
        commit(a.socket, stroke),
        commit(a.socket, stroke),
      ]);
      const third = await commit(a.socket, stroke);

      expect(seqOf(first)).toBe(1);
      expect(seqOf(second)).toBe(1);
      expect(seqOf(third)).toBe(1);
      expect(await prisma.boardStroke.count({ where: { boardId } })).toBe(1);
      expect(
        (await prisma.board.findUniqueOrThrow({ where: { id: boardId } }))
          .lastSeq,
      ).toBe(1);
    });

    it('다른 사람의 획 ID로는 저장할 수 없다', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner);
      const b = await connect(boardId, guest);
      const stroke = makeStroke();
      await commit(a.socket, stroke);

      expect(await commit(b.socket, stroke)).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', retryable: false },
      });
    });

    it('다른 보드에서 같은 획 ID를 써도 충돌하지 않는다', async () => {
      const first = await createBoard();
      const second = await createBoard();
      const a = await connect(first.boardId, first.owner);
      const b = await connect(second.boardId, second.owner);
      const stroke = makeStroke();

      expect(seqOf(await commit(a.socket, stroke))).toBe(1);
      expect(seqOf(await commit(b.socket, stroke))).toBe(1);
    });
  });

  describe('검증', () => {
    it.each<[string, Partial<BoardStrokeInput>]>([
      ['획 ID가 UUID가 아니면', { id: 'stroke' }],
      ['스키마 버전을 모르면', { v: 2 }],
      ['색 형식이 틀리면', { color: 'red' }],
      ['크기가 범위를 넘으면', { size: 201 }],
      ['점 개수가 채널과 맞지 않으면', { points: [1, 2, 3] }],
      ['점이 없으면', { points: [] }],
      ['좌표가 한도를 넘으면', { points: [2_000_000, 0, 1, 0, 0, 0] }],
      ['x 채널이 없으면', { channels: ['y'], points: [1] }],
      ['펜인데 범위가 all이면', { eraseScope: 'all' }],
    ])('%s BAD_REQUEST', async (_, patch) => {
      const { boardId, owner } = await createBoard();
      const a = await connect(boardId, owner);

      expect(await commit(a.socket, makeStroke(patch))).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', retryable: false },
      });
    });

    it('점 개수 한도를 넘으면 BAD_REQUEST', async () => {
      const { boardId, owner } = await createBoard();
      const a = await connect(boardId, owner);
      const points = new Array(11_001 * 2).fill(1) as number[];

      const ack = await commit(
        a.socket,
        makeStroke({ channels: ['x', 'y'], points }),
      );

      expect(ack).toMatchObject({ ok: false, error: { code: 'BAD_REQUEST' } });
    });

    it('범위 all 지우기는 소유자만 쓸 수 있다', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner);
      const b = await connect(boardId, guest);
      const eraser = (): BoardStrokeInput =>
        makeStroke({ tool: 'eraser', eraseScope: 'all' });

      expect(await commit(b.socket, eraser())).toEqual({
        ok: false,
        error: { code: 'FORBIDDEN', retryable: false },
      });
      expect(seqOf(await commit(a.socket, eraser()))).toBe(1);
    });

    it('너무 자주 보내면 재시도 가능한 RATE_LIMITED로 답한다', async () => {
      const { boardId, owner } = await createBoard();
      const a = await connect(boardId, owner);

      const acks = await Promise.all(
        Array.from({ length: 200 }, () =>
          send(a.socket, 'stroke:hide', { opId: 'bad', strokeId: 'bad' }),
        ),
      );

      expect(acks).toContainEqual({
        ok: false,
        error: { code: 'RATE_LIMITED', retryable: true },
      });
    });
  });

  describe('숨기기·보이기·전체 지우기', () => {
    it('내 획을 숨기고 다시 보이면 show에 획 전체가 실려 온다', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner, 0);
      const b = await connect(boardId, guest, 1);
      const stroke = makeStroke();
      await commit(a.socket, stroke);

      const opId = randomUUID();
      const hideAck = await send(a.socket, 'stroke:hide', {
        opId,
        strokeId: stroke.id,
      });
      expect(hideAck).toEqual({ ok: true, data: { seq: 2 } });

      // 같은 작업 재전송은 그 결과 그대로
      expect(
        await send(a.socket, 'stroke:hide', { opId, strokeId: stroke.id }),
      ).toEqual({ ok: true, data: { seq: 2 } });
      // 다른 작업이지만 이미 숨김 상태면 순서를 쓰지 않는다.
      expect(
        await send(a.socket, 'stroke:hide', {
          opId: randomUUID(),
          strokeId: stroke.id,
        }),
      ).toEqual({ ok: true, data: { seq: null } });

      expect((await snapshot(boardId, owner).expect(200)).body.strokes).toEqual(
        [],
      );

      const showAck = await send(a.socket, 'stroke:show', {
        opId: randomUUID(),
        strokeId: stroke.id,
      });
      expect(showAck).toEqual({ ok: true, data: { seq: 3 } });
      await until(() => b.changes.some((change) => change.type === 'show'));
      expect(b.changes.find((change) => change.type === 'show')).toMatchObject({
        seq: 3,
        authorId: owner.id,
        stroke: { id: stroke.id, seq: 1, points: stroke.points },
      });
      expect(
        (await snapshot(boardId, owner).expect(200)).body.strokes,
      ).toHaveLength(1);
    });

    it('남의 획은 숨길 수 없다(소유자도)', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner);
      const b = await connect(boardId, guest);
      const stroke = makeStroke();
      await commit(b.socket, stroke);

      expect(
        await send(a.socket, 'stroke:hide', {
          opId: randomUUID(),
          strokeId: stroke.id,
        }),
      ).toEqual({ ok: false, error: { code: 'FORBIDDEN', retryable: false } });
    });

    it('전체 지우기는 내 펜 획과 own 지우개만 숨기고 데이터는 남긴다', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner);
      const b = await connect(boardId, guest);
      const pen = makeStroke();
      const ownEraser = makeStroke({ tool: 'eraser', eraseScope: 'own' });
      const allEraser = makeStroke({ tool: 'eraser', eraseScope: 'all' });
      const guestPen = makeStroke();
      await commit(a.socket, pen);
      await commit(a.socket, ownEraser);
      await commit(a.socket, allEraser);
      await commit(b.socket, guestPen);

      const opId = randomUUID();
      const ack = await send(a.socket, 'stroke:clear', { opId });
      expect(ack).toEqual({ ok: true, data: { seq: 5 } });
      expect(await send(a.socket, 'stroke:clear', { opId })).toEqual({
        ok: true,
        data: { seq: 5 },
      });
      await until(() => b.changes.some((change) => change.type === 'clear'));

      const { body } = await snapshot(boardId, guest).expect(200);
      expect(body.strokes.map((s: { id: string }) => s.id)).toEqual([
        allEraser.id,
        guestPen.id,
      ]);
      expect(body.lastSeq).toBe(5);
      const hidden = await prisma.boardStroke.findMany({
        where: { boardId, hiddenBySeq: 5 },
      });
      expect(hidden.map((s) => s.id).sort()).toEqual(
        [pen.id, ownEraser.id].sort(),
      );

      // 전체 지우기로 지운 획은 다른 탭에서도 되돌릴 수 없다.
      expect(
        await send(a.socket, 'stroke:show', {
          opId: randomUUID(),
          strokeId: pen.id,
        }),
      ).toEqual({ ok: false, error: { code: 'FORBIDDEN', retryable: false } });
    });
  });

  describe('스냅샷과 다시 연결', () => {
    it('보드 토큰으로 페이지를 나눠 보이는 획을 받는다', async () => {
      const { boardId, owner } = await createBoard();
      const total = 205;
      await prisma.boardStroke.createMany({
        data: Array.from({ length: total }, (_, i) => ({
          boardId,
          id: randomUUID(),
          seq: i + 1,
          authorId: owner.id,
          v: 1,
          tool: 'PEN' as const,
          brushId: 'round',
          brushVersion: 1,
          color: '#000000',
          size: 4,
          channels: ['x', 'y'],
          points: [i, 0],
        })),
      });
      await prisma.board.update({
        where: { id: boardId },
        data: { lastSeq: total },
      });

      const first = await snapshot(boardId, owner).expect(200);
      expect(first.headers['cache-control']).toBe('no-store');
      expect(first.body.lastSeq).toBe(total);
      expect(first.body.strokes).toHaveLength(200);
      expect(first.body.nextCursor).toBe(200);

      const second = await snapshot(boardId, owner, 200).expect(200);
      expect(second.body.strokes.map((s: { seq: number }) => s.seq)).toEqual([
        201, 202, 203, 204, 205,
      ]);
      expect(second.body.nextCursor).toBeNull();
    });

    it('토큰이 없거나 다른 보드의 토큰이면 401이다', async () => {
      const { boardId, owner } = await createBoard();
      const other = await createBoard();

      await request(apps[0].getHttpServer())
        .get(`/boards/${boardId}/snapshot`)
        .expect(401);
      await request(apps[0].getHttpServer())
        .get(`/boards/${boardId}/snapshot`)
        .set('x-board-token', tokenOf(other.boardId, other.owner))
        .expect(401);
      await snapshot(boardId, owner).expect(200);
    });

    it('sinceSeq 다음의 변경을 순서대로 돌려주고 숨긴 획의 show는 획 전체를 담는다', async () => {
      const { boardId, owner } = await createBoard();
      const a = await connect(boardId, owner);
      const s1 = makeStroke();
      const s2 = makeStroke();
      await commit(a.socket, s1);
      await commit(a.socket, s2);
      await send(a.socket, 'stroke:hide', {
        opId: randomUUID(),
        strokeId: s1.id,
      });
      await send(a.socket, 'stroke:show', {
        opId: randomUUID(),
        strokeId: s1.id,
      });
      await send(a.socket, 'stroke:clear', { opId: randomUUID() });

      const ack = await send<SyncResult>(a.socket, 'strokes:sync', {
        sinceSeq: 1,
      });

      if (!ack.ok || 'reset' in ack.data) throw new Error('변경을 받지 못함');
      expect(ack.data.changes.map(({ seq, type }) => [seq, type])).toEqual([
        [2, 'stroke'],
        [3, 'hide'],
        [4, 'show'],
        [5, 'clear'],
      ]);
      expect(ack.data.changes[2]).toMatchObject({
        stroke: { id: s1.id, seq: 1 },
      });
      expect(ack.data.upToSeq).toBe(5);
      expect(ack.data.hasMore).toBe(false);
    });

    it('클라이언트 seq가 서버보다 앞서면 reset을 돌려준다', async () => {
      const { boardId, owner } = await createBoard();
      const a = await connect(boardId, owner);

      expect(await send(a.socket, 'strokes:sync', { sinceSeq: 10 })).toEqual({
        ok: true,
        data: { reset: true },
      });
      expect(
        await send(a.socket, 'strokes:sync', { sinceSeq: -1 }),
      ).toMatchObject({ ok: false, error: { code: 'BAD_REQUEST' } });
    });
  });

  describe('preview', () => {
    it('다른 참여자에게만 작성자를 붙여 중계하고 저장하지 않는다', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner, 0);
      const b = await connect(boardId, guest, 1);
      const stroke = makeStroke();

      a.socket.emit('stroke:preview', {
        ...stroke,
        index: 0,
        authorId: guest.id,
      });

      await until(() => b.previews.length === 1);
      expect(b.previews[0]).toMatchObject({
        id: stroke.id,
        authorId: owner.id,
        index: 0,
      });
      await settle();
      expect(a.previews).toHaveLength(0);
      expect(await prisma.boardStroke.count({ where: { boardId } })).toBe(0);
    });

    it('한도를 넘거나 잘못된 preview는 버린다', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, owner);
      const b = await connect(boardId, guest);

      a.socket.emit('stroke:preview', {
        ...makeStroke({
          channels: ['x', 'y'],
          points: new Array(129 * 2).fill(1) as number[],
        }),
        index: 0,
      });
      a.socket.emit('stroke:preview', { ...makeStroke(), index: -1 });

      await settle();
      expect(b.previews).toHaveLength(0);
    });
  });

  describe('인원 제한', () => {
    const connectError = (boardId: string, member: Member, server = 0) =>
      connect(boardId, member, server).then(
        () => null,
        (e: Error & { data?: { statusCode: number } }) => e,
      );

    it('다른 서버의 접속자까지 세어 정원을 넘으면 BOARD_FULL로 거절한다', async () => {
      const { boardId, owner } = await createBoard({ maxMembers: 2 });
      const first = await createGuest(boardId);
      const second = await createGuest(boardId);
      const third = await createGuest(boardId);
      const a = await connect(boardId, first, 0);
      expect(a.hello.limits.maxMembers).toBe(2);
      await connect(boardId, second, 1);

      const error = await connectError(boardId, third, 0);

      expect(error).toMatchObject({
        message: 'BOARD_FULL',
        data: { statusCode: 409 },
      });
      await request(apps[0].getHttpServer())
        .post(`/boards/${boardId}/join`)
        .send({})
        .expect(409);
      expect(owner.id).toBeTruthy();
    });

    it('같은 참여자의 다른 탭은 한 명으로 센다', async () => {
      const { boardId } = await createBoard({ maxMembers: 1 });
      const guest = await createGuest(boardId);
      await connect(boardId, guest, 0);

      await expect(connect(boardId, guest, 1)).resolves.toBeTruthy();
    });

    it('소유자는 정원이 차도 들어온다', async () => {
      const { boardId, owner } = await createBoard({ maxMembers: 1 });
      const guest = await createGuest(boardId);
      await connect(boardId, guest, 0);

      await expect(connect(boardId, owner, 1)).resolves.toBeTruthy();
    });

    it('이미 접속 중인 게스트는 입장 API도 통과한다', async () => {
      const { boardId } = await createBoard({ maxMembers: 1 });
      const guest = await createGuest(boardId);
      await connect(boardId, guest, 1);

      const { body } = await request(apps[0].getHttpServer())
        .post(`/boards/${boardId}/join`)
        .send({ boardToken: tokenOf(boardId, guest) })
        .expect(200);

      expect(body.member.id).toBe(guest.id);
      expect(body.isOwner).toBe(false);
    });

    it('동시에 들어와 넘치면 늦게 들어온 쪽이 끊긴다', async () => {
      const { boardId } = await createBoard({ maxMembers: 1 });
      const guests = await Promise.all([
        createGuest(boardId),
        createGuest(boardId),
        createGuest(boardId),
      ]);

      const results = await Promise.all(
        guests.map((guest, i) => {
          const socket = io(urls[i % 2], {
            auth: { boardToken: tokenOf(boardId, guest), protocol: 1 },
            transports: ['websocket'],
            forceNew: true,
            reconnection: false,
          });
          sockets.push(socket);
          return new Promise<'hello' | 'closed'>((resolve) => {
            socket.once('hello', () => resolve('hello'));
            socket.once('connect_error', () => resolve('closed'));
            socket.once('disconnect', () => resolve('closed'));
          });
        }),
      );

      expect(results).toContain('hello');
      await until(
        () => sockets.filter((socket) => socket.connected).length === 1,
      );
    });
  });

  describe('입장 응답과 참여자 변화', () => {
    const joinAs = (boardId: string, userId: string, boardToken?: string) => {
      readCookie.mockReturnValue('session');
      authenticateRequest.mockResolvedValue({ userId });
      return request(apps[0].getHttpServer())
        .post(`/boards/${boardId}/join`)
        .send(boardToken ? { boardToken } : {});
    };

    it('소유자에게 isOwner를 돌려준다', async () => {
      const { boardId, owner } = await createBoard();

      const { body } = await joinAs(boardId, owner.userId as string).expect(
        200,
      );

      expect(body.isOwner).toBe(true);
    });

    it('게스트를 계정에 합치면 획이 옮겨지고 merge가 전달되고 게스트 소켓이 끊긴다', async () => {
      const { boardId, owner } = await createBoard();
      const user = await createUserMember(boardId);
      const guest = await createGuest(boardId);
      const watcher = await connect(boardId, owner, 1);
      const guestSocket = await connect(boardId, guest, 0);
      const stroke = makeStroke();
      await commit(guestSocket.socket, stroke);
      await send(guestSocket.socket, 'stroke:hide', {
        opId: randomUUID(),
        strokeId: stroke.id,
      });
      const disconnected = new Promise((resolve) =>
        guestSocket.socket.once('disconnect', resolve),
      );

      const { body } = await joinAs(
        boardId,
        user.userId as string,
        tokenOf(boardId, guest),
      ).expect(200);

      expect(body.claimedGuestId).toBe(guest.id);
      expect(body.member.id).toBe(user.id);
      await disconnected;
      await until(() =>
        watcher.changes.some((change) => change.type === 'merge'),
      );
      expect(
        watcher.changes.find((change) => change.type === 'merge'),
      ).toMatchObject({ seq: 3, from: guest.id, to: user.id });

      const row = await prisma.boardStroke.findUniqueOrThrow({
        where: { boardId_id: { boardId, id: stroke.id } },
      });
      expect(row.authorId).toBe(user.id);
      expect(
        await prisma.boardMember.findUnique({ where: { id: guest.id } }),
      ).toBeNull();
      expect(
        await prisma.boardOp.count({
          where: { boardId, authorId: guest.id },
        }),
      ).toBe(0);

      const again = await send<SyncResult>(watcher.socket, 'strokes:sync', {
        sinceSeq: 2,
      });
      expect(again).toMatchObject({
        ok: true,
        data: { changes: [{ type: 'merge', from: guest.id, to: user.id }] },
      });
    });

    it('회원이 탈퇴해도 획은 남고 익명 참여자가 되며 다시 입장에 쓸 수 없다', async () => {
      const { boardId, owner } = await createBoard();
      const user = await createUserMember(boardId);
      const a = await connect(boardId, user);
      const stroke = makeStroke();
      await commit(a.socket, stroke);
      a.socket.disconnect();
      await settle();

      await prisma.user.delete({ where: { id: user.userId as string } });

      const member = await prisma.boardMember.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(member).toMatchObject({ userId: null, name: null });
      const { body } = await snapshot(boardId, owner).expect(200);
      expect(body.strokes.map((s: { id: string }) => s.id)).toEqual([
        stroke.id,
      ]);

      const asGuestToken = { ...user, userId: null, type: 'GUEST' as const };
      await expect(connect(boardId, user)).rejects.toMatchObject({
        message: 'BOARD_MEMBER',
      });
      await expect(connect(boardId, asGuestToken)).rejects.toMatchObject({
        message: 'BOARD_MEMBER',
      });
      const rejoin = await request(apps[0].getHttpServer())
        .post(`/boards/${boardId}/join`)
        .send({ boardToken: tokenOf(boardId, asGuestToken) })
        .expect(200);
      expect(rejoin.body.member.id).not.toBe(user.id);
    });

    it('보드를 지우면 획과 작업도 함께 지워진다', async () => {
      const { boardId, owner } = await createBoard();
      const a = await connect(boardId, owner);
      const stroke = makeStroke();
      await commit(a.socket, stroke);
      await send(a.socket, 'stroke:clear', { opId: randomUUID() });
      a.socket.disconnect();
      await settle();

      await prisma.board.delete({ where: { id: boardId } });

      expect(await prisma.boardStroke.count({ where: { boardId } })).toBe(0);
      expect(await prisma.boardOp.count({ where: { boardId } })).toBe(0);
    });

    it('소유자가 탈퇴하면 보드가 함께 지워진다(지금 정책)', async () => {
      const { boardId, owner } = await createBoard();
      const guest = await createGuest(boardId);
      const a = await connect(boardId, guest);
      await commit(a.socket, makeStroke());
      a.socket.disconnect();
      await settle();

      await prisma.user.delete({ where: { id: owner.userId as string } });

      expect(
        await prisma.board.findUnique({ where: { id: boardId } }),
      ).toBeNull();
      expect(await prisma.boardStroke.count({ where: { boardId } })).toBe(0);
    });
  });
});
