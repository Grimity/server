import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TransactionHost } from '@nestjs-cls/transactional';
import { createHmac } from 'crypto';
import { io, Socket } from 'socket.io-client';
import { RedisService } from 'src/database/redis/redis.service';
import { WebSessionService } from 'src/module/auth/web-session.service';
import { TypedEventEmitter } from 'src/infrastructure/event/typed-event-emitter';
import { BoardGatewayModule } from 'src/module/board/board-gateway.module';

// 서버 두 대를 같은 Redis에 붙여 다른 서버의 소켓에도 알림이 가는지 확인한다.
describe('보드 소켓 (/boards)', () => {
  const apps: INestApplication[] = [];
  const redisServices: RedisService[] = [];
  const urls: string[] = [];
  const sockets: Socket[] = [];

  const boardId = '6ab964c5-bc5b-4a8f-9dc7-c11cad940b49';
  const ownerId = '0c5e7a0e-8d0b-4a63-a7a4-62f4e8d6c3a1';
  const userId = '357c2503-30ea-4a48-95c0-2651428a37d3';
  const userMemberId = '4b8e2d7a-1c3f-4e5a-9b6d-7f0e1a2b3c4d';
  const guestId = 'f1d3c1f2-6c55-4b7e-9a59-5c3f2f8e9a01';
  const ownerMemberId = '9c2f6c1e-7a1d-4a55-8e6b-3d2c1b0a9f88';
  const jwtSecret = 'board-test-secret';
  const boardSecret = createHmac('sha256', jwtSecret)
    .update('grimity:board:v1')
    .digest('hex');
  const jwt = new JwtService({ secret: jwtSecret });

  const findBoard = jest.fn();
  const findMember = jest.fn();

  type Hello = {
    protocol: number;
    serverTime: number;
    self: { memberId: string; permission: string };
    members: Member[];
    limits: Record<string, number>;
  };

  type Member = {
    id: string;
    userId: string | null;
    type: 'USER' | 'GUEST';
    name: string;
    image: string | null;
  };

  const user: Member = {
    id: userMemberId,
    userId,
    type: 'USER',
    name: '그림쟁이',
    image: 'https://image.test/profile/a.jpg',
  };
  const guest: Member = {
    id: guestId,
    userId: null,
    type: 'GUEST',
    name: '열정적인 코뿔소',
    image: null,
  };
  const owner: Member = {
    id: ownerMemberId,
    userId: ownerId,
    type: 'USER',
    name: '보드주인',
    image: null,
  };

  // 참여자 행: 소유자와 링크로 들어온 사용자·게스트
  const rows: Record<string, object> = {
    [userMemberId]: { id: userMemberId, userId, permission: null },
    [guestId]: { id: guestId, userId: null, permission: null },
    [ownerMemberId]: { id: ownerMemberId, userId: ownerId, permission: 'EDIT' },
  };

  const board = (linkPermission: 'NONE' | 'EDIT') => ({
    id: boardId,
    title: '새 그리미티 보드',
    ownerId,
    linkPermission,
  });

  const tokenOf = (member: Member, expiresIn = 60 * 60, secret = boardSecret) =>
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
      { secret, algorithm: 'HS256', expiresIn },
    );

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
      imports: [BoardGatewayModule],
    })
      .useMocker((token) => {
        if (token === TransactionHost) {
          return {
            tx: {
              board: { findUnique: findBoard },
              boardMember: { findFirst: findMember },
            },
          };
        }
        if (token === JwtService) return jwt;
        if (token === ConfigService) return { getOrThrow: () => jwtSecret };
        if (token === RedisService) return redisService;
        if (token === WebSessionService) return {};
      })
      .compile();

    const app = module.createNestApplication();
    await app.listen(0);
    apps.push(app);
    urls.push(`${await app.getUrl()}/boards`.replace('[::1]', 'localhost'));
  };

  const NO_PROTOCOL = Symbol('no protocol');

  // 서버가 연결 직후 보내는 이벤트를 놓치지 않도록 리스너를 먼저 단다.
  const connect = (
    token: string | undefined,
    server = 0,
    protocol: unknown = 1,
  ) => {
    const auth: Record<string, unknown> = {};
    if (token !== undefined) auth.boardToken = token;
    if (protocol !== NO_PROTOCOL) auth.protocol = protocol;
    const socket = io(urls[server], {
      auth,
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      autoConnect: false,
    });
    sockets.push(socket);
    const joined: Member[] = [];
    const left: { memberId: string }[] = [];
    socket.on('members:joined', ({ member }: { member: Member }) =>
      joined.push(member),
    );
    socket.on('members:left', (payload: { memberId: string }) =>
      left.push(payload),
    );
    const hello = new Promise<Hello>((resolve) =>
      socket.once('hello', resolve),
    );
    const members = hello.then((payload) => payload.members);
    const error = new Promise<{
      message: string;
      data?: Record<string, number>;
    }>((resolve) => socket.once('connect_error', resolve));
    socket.connect();
    return { socket, hello, members, error, joined, left };
  };

  const waitFor = <T>(
    socket: Socket,
    event: string,
    match: (payload: T) => boolean = () => true,
  ) =>
    new Promise<T>((resolve) => {
      const listener = (payload: T) => {
        if (!match(payload)) return;
        socket.off(event, listener);
        resolve(payload);
      };
      socket.on(event, listener);
    });

  // 알림이 오지 않았음을 확인할 때 다른 서버를 거쳐 올 시간을 기다린다.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

  beforeAll(async () => {
    process.env.IMAGE_URL = 'https://image.test';
    await createApp();
    await createApp();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    findBoard.mockResolvedValue(board('EDIT'));
    findMember.mockImplementation(
      ({ where }: { where: { id: string; boardId: string } }) =>
        where.boardId === boardId ? (rows[where.id] ?? null) : null,
    );
  });

  afterEach(async () => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
    await settle();
  });

  afterAll(async () => {
    for (const app of apps) await app.close();
    // 목으로 넣은 RedisService는 앱이 닫지 않는다.
    for (const redisService of redisServices) {
      for (const client of [redisService.pubClient, redisService.subClient]) {
        if (client.status !== 'end') await client.quit();
      }
    }
  });

  describe('인증', () => {
    it('유효한 보드 토큰이면 연결하고 hello로 보드 상태를 받는다', async () => {
      const { hello } = connect(tokenOf(user));

      expect(await hello).toEqual({
        protocol: 1,
        serverTime: expect.any(Number),
        self: { memberId: userMemberId, permission: 'EDIT' },
        members: [user],
        limits: {},
      });
      expect(findMember).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: userMemberId, boardId } }),
      );
    });

    it.each([
      ['토큰이 없으면', undefined],
      ['만료됐으면', tokenOf(user, -10)],
      ['다른 키로 서명했으면', tokenOf(user, 60 * 60, jwtSecret)],
      ['보드 토큰 형식이 아니면', 'not-a-token'],
    ])('%s BOARD_TOKEN으로 거절한다', async (_, token) => {
      const { error } = connect(token);

      expect(await error).toMatchObject({
        message: 'BOARD_TOKEN',
        data: { statusCode: 401 },
      });
      expect(findBoard).not.toHaveBeenCalled();
    });

    it.each([
      ['규약 버전이 없으면', NO_PROTOCOL],
      ['지원하는 버전보다 낮으면', 0],
      ['지원하는 버전보다 높으면', 2],
      ['숫자가 아니면', '1'],
    ])(
      '%s 토큰보다 먼저 PROTOCOL로 거절하고 지원 범위를 알려 준다',
      async (_, protocol) => {
        const { error } = connect(tokenOf(user), 0, protocol);

        expect(await error).toMatchObject({
          message: 'PROTOCOL',
          data: { statusCode: 426, minProtocol: 1, maxProtocol: 1 },
        });
        expect(findBoard).not.toHaveBeenCalled();
      },
    );

    it('보드가 없으면 BOARD로 거절한다', async () => {
      findBoard.mockResolvedValue(null);

      const { error } = connect(tokenOf(user));

      expect(await error).toMatchObject({
        message: 'BOARD',
        data: { statusCode: 404 },
      });
    });

    it('링크 권한이 NONE으로 바뀌었으면 링크로 들어온 참여자를 거절한다', async () => {
      findBoard.mockResolvedValue(board('NONE'));

      const { error } = connect(tokenOf(guest));

      expect(await error).toMatchObject({
        message: 'BOARD_ACCESS',
        data: { statusCode: 403 },
      });
    });

    it('링크 권한이 NONE이어도 소유자는 연결한다', async () => {
      findBoard.mockResolvedValue(board('NONE'));

      const { members } = connect(tokenOf(owner));

      expect(await members).toEqual([owner]);
    });

    it('계정에 합쳐져 지워진 게스트 행이면 BOARD_MEMBER로 거절한다', async () => {
      findMember.mockResolvedValue(null);

      const { error } = connect(tokenOf(guest));

      expect(await error).toMatchObject({
        message: 'BOARD_MEMBER',
        data: { statusCode: 401 },
      });
    });

    it('게스트 행이 사용자 행으로 바뀌었으면 예전 게스트 토큰을 거절한다', async () => {
      findMember.mockResolvedValue({ id: guestId, userId, permission: null });

      const { error } = connect(tokenOf(guest));

      expect(await error).toMatchObject({ message: 'BOARD_MEMBER' });
    });

    it('DB 조회가 실패하면 INTERNAL로 거절한다', async () => {
      findBoard.mockRejectedValue(new Error('db down'));

      const { error } = connect(tokenOf(user));

      expect(await error).toMatchObject({
        message: 'INTERNAL',
        data: { statusCode: 500 },
      });
    });
  });

  describe('접속자 표시', () => {
    it('다른 서버에 붙은 참여자의 입장·퇴장을 알린다', async () => {
      const first = connect(tokenOf(user), 0);
      expect(await first.members).toEqual([user]);

      const joined = waitFor<{ member: Member }>(
        first.socket,
        'members:joined',
      );
      const second = connect(tokenOf(guest), 1);

      // 새로 들어온 쪽은 다른 서버의 참여자까지 먼저 들어온 순서로 받는다.
      expect(await second.members).toEqual([user, guest]);
      expect(await joined).toEqual({ member: guest });

      const left = waitFor(first.socket, 'members:left');
      second.socket.disconnect();
      expect(await left).toEqual({ memberId: guestId });
      // 자기 자신의 입장은 다른 참여자에게만 알린다.
      expect(second.joined).toEqual([]);
    });

    it('같은 참여자가 서버를 나눠 여러 탭으로 붙어도 한 명으로 알린다', async () => {
      const observer = connect(tokenOf(owner), 0);
      await observer.members;

      const tab1 = connect(tokenOf(user), 0);
      await tab1.members;
      const tab2 = connect(tokenOf(user), 1);
      expect(await tab2.members).toEqual([owner, user]);
      await settle();
      expect(observer.joined).toEqual([user]);

      tab1.socket.disconnect();
      await settle();
      expect(observer.left).toEqual([]);

      tab2.socket.disconnect();
      await settle();
      expect(observer.left).toEqual([{ memberId: userMemberId }]);
    });

    it('다른 보드의 입장은 알리지 않는다', async () => {
      const otherBoardId = 'b2f0a8a4-2a59-4f4e-9a3b-2f6b2d1f7c10';
      findBoard.mockImplementation(({ where }: { where: { id: string } }) => ({
        ...board('EDIT'),
        id: where.id,
      }));
      findMember.mockImplementation(
        ({ where }: { where: { id: string } }) => rows[where.id] ?? null,
      );
      const observer = connect(tokenOf(owner), 0);
      await observer.members;

      const otherToken = jwt.sign(
        {
          purpose: 'board',
          boardId: otherBoardId,
          memberId: guestId,
          userId: null,
          type: 'GUEST',
          name: guest.name,
          image: null,
          permission: 'EDIT',
        },
        { secret: boardSecret, algorithm: 'HS256', expiresIn: 60 * 60 },
      );
      const other = connect(otherToken, 1);
      expect(await other.members).toEqual([guest]);
      await settle();
      expect(observer.joined).toEqual([]);
    });

    it('members:sync로 모든 서버의 접속자 목록을 다시 받는다', async () => {
      const first = connect(tokenOf(user), 0);
      await first.members;
      const second = connect(tokenOf(guest), 1);
      await second.members;

      const result: unknown = await first.socket
        .timeout(2000)
        .emitWithAck('members:sync', {});

      expect(result).toEqual({ ok: true, data: { members: [user, guest] } });
    });

    it('요청 본문이 객체가 아니면 BAD_REQUEST로 답한다', async () => {
      const { socket, members } = connect(tokenOf(user));
      await members;

      const result: unknown = await socket
        .timeout(2000)
        .emitWithAck('members:sync', 'not-an-object');

      expect(result).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', retryable: false },
      });
    });
  });
});
