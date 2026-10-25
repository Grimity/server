import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Prisma } from '@prisma/client';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import { globalPipe } from 'src/core/pipe/global.pipe';
import { WebSessionService } from 'src/module/auth/web-session.service';
import { BoardModule } from 'src/module/board/board.module';

describe('POST /boards/:id/join', () => {
  let app: INestApplication;
  const userId = '357c2503-30ea-4a48-95c0-2651428a37d3';
  const ownerId = '0c5e7a0e-8d0b-4a63-a7a4-62f4e8d6c3a1';
  const boardId = '6ab964c5-bc5b-4a8f-9dc7-c11cad940b49';
  const otherBoardId = 'b2f0a8a4-2a59-4f4e-9a3b-2f6b2d1f7c10';
  const guestId = 'f1d3c1f2-6c55-4b7e-9a59-5c3f2f8e9a01';
  const newGuestId = '9c2f6c1e-7a1d-4a55-8e6b-3d2c1b0a9f88';
  const userMemberId = '4b8e2d7a-1c3f-4e5a-9b6d-7f0e1a2b3c4d';
  const jwtSecret = 'board-test-secret';
  const boardSecret = createHmac('sha256', jwtSecret)
    .update('grimity:board:v1')
    .digest('hex');
  const jwt = new JwtService({ secret: jwtSecret });

  const findBoard = jest.fn();
  const findMember = jest.fn();
  const findGuest = jest.fn();
  const createGuest = jest.fn();
  const upsertMember = jest.fn();
  const convertGuest = jest.fn();
  const deleteGuest = jest.fn();
  const findUser = jest.fn();
  const authenticateRequest = jest.fn();
  const readCookie = jest.fn();

  const board = (linkPermission: 'NONE' | 'EDIT') => ({
    id: boardId,
    title: '새 그리미티 보드',
    ownerId,
    linkPermission,
  });

  const signBoardToken = (claims: object, expiresIn = 60 * 60) =>
    jwt.sign(
      { purpose: 'board', ...claims },
      { secret: boardSecret, algorithm: 'HS256', expiresIn },
    );

  const guestToken = (claims: object = {}, expiresIn?: number) =>
    signBoardToken(
      {
        boardId,
        memberId: guestId,
        userId: null,
        type: 'GUEST',
        name: '열정적인 코뿔소',
        image: null,
        permission: 'EDIT',
        ...claims,
      },
      expiresIn,
    );

  const uniqueError = () =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

  const decodeBoardToken = (token: string) =>
    jwt.verify(token, { secret: boardSecret, algorithms: ['HS256'] });

  const join = (body: object = {}) =>
    request(app.getHttpServer()).post(`/boards/${boardId}/join`).send(body);

  beforeAll(async () => {
    process.env.IMAGE_URL = 'https://image.test';
    const module = await Test.createTestingModule({
      imports: [BoardModule],
      providers: [globalPipe],
    })
      .useMocker((token) => {
        if (token === TransactionHost) {
          return {
            tx: {
              board: { findUnique: findBoard },
              boardMember: {
                findUnique: findMember,
                findFirst: findGuest,
                create: createGuest,
                upsert: upsertMember,
                updateMany: convertGuest,
                deleteMany: deleteGuest,
              },
              user: { findUnique: findUser },
            },
          };
        }
        if (token === JwtService) return jwt;
        if (token === WebSessionService) {
          return { authenticateRequest, readCookie };
        }
        if (token === ConfigService) return { getOrThrow: () => jwtSecret };
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    authenticateRequest.mockRejectedValue(new UnauthorizedException());
    findMember.mockResolvedValue(null);
    findGuest.mockResolvedValue(null);
    createGuest.mockImplementation(({ data }) => ({
      id: newGuestId,
      name: data.name,
    }));
    upsertMember.mockResolvedValue({ id: userMemberId });
    convertGuest.mockResolvedValue({ count: 0 });
    deleteGuest.mockResolvedValue({ count: 0 });
    findUser.mockResolvedValue({
      id: userId,
      name: '유저',
      image: 'profile/a.jpg',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('보드가 없으면 404를 반환한다', async () => {
    findBoard.mockResolvedValue(null);

    await join().expect(404);
  });

  describe('비로그인 사용자', () => {
    it('링크 권한이 EDIT면 형용사+동물 이름의 게스트 참여자로 입장하고 보드 토큰을 발급한다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));

      const { body } = await join().expect(200);

      expect(body).toMatchObject({
        id: boardId,
        title: '새 그리미티 보드',
        permission: 'EDIT',
        member: { id: newGuestId, userId: null, type: 'GUEST', image: null },
        claimedGuestId: null,
      });
      expect(body.member.name).toMatch(/^[가-힣 ]+ [가-힣]+$/);
      expect(createGuest).toHaveBeenCalledWith({
        data: { boardId, name: body.member.name },
        select: { id: true, name: true },
      });
      expect(upsertMember).not.toHaveBeenCalled();
      expect(decodeBoardToken(body.boardToken)).toMatchObject({
        purpose: 'board',
        boardId,
        memberId: newGuestId,
        userId: null,
        type: 'GUEST',
        name: body.member.name,
        permission: 'EDIT',
      });
    });

    it('보드 안에서 이름이 겹치면 다른 이름으로 다시 만든다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));
      createGuest
        .mockRejectedValueOnce(uniqueError())
        .mockRejectedValueOnce(uniqueError());

      const { body } = await join().expect(200);

      expect(createGuest).toHaveBeenCalledTimes(3);
      expect(body.member.name).toBe(createGuest.mock.calls[2][0].data.name);
    });

    it('이름이 계속 겹치면 숫자를 붙여 만든다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));
      for (let i = 0; i < 5; i++) {
        createGuest.mockRejectedValueOnce(uniqueError());
      }

      const { body } = await join().expect(200);

      expect(createGuest).toHaveBeenCalledTimes(6);
      expect(body.member.name).toMatch(/ \d{4}$/);
    });

    it('이전 게스트 토큰을 보내면 만료됐어도 같은 게스트 참여자로 입장한다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));
      findGuest.mockResolvedValue({ id: guestId, name: '졸린 수달' });

      const { body } = await join({ boardToken: guestToken({}, -10) }).expect(
        200,
      );

      expect(body.member).toEqual({
        id: guestId,
        userId: null,
        type: 'GUEST',
        name: '졸린 수달',
        image: null,
      });
      expect(findGuest).toHaveBeenCalledWith({
        where: { id: guestId, boardId, userId: null },
        select: { id: true, name: true },
      });
      expect(createGuest).not.toHaveBeenCalled();
    });

    it('계정에 연결된 게스트의 토큰이면 새 게스트로 입장한다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));

      const { body } = await join({ boardToken: guestToken() }).expect(200);

      expect(findGuest).toHaveBeenCalledTimes(1);
      expect(body.member.id).toBe(newGuestId);
    });

    it.each([
      ['다른 보드의 토큰', () => guestToken({ boardId: otherBoardId })],
      [
        '다른 키로 서명한 토큰',
        () =>
          jwt.sign({
            purpose: 'board',
            boardId,
            memberId: guestId,
            type: 'GUEST',
            name: '열정적인 코뿔소',
          }),
      ],
      ['로그인 사용자의 토큰', () => guestToken({ type: 'USER', userId })],
    ])('%s이면 조회 없이 새 게스트로 입장한다', async (_, token) => {
      findBoard.mockResolvedValue(board('EDIT'));

      const { body } = await join({ boardToken: token() }).expect(200);

      expect(findGuest).not.toHaveBeenCalled();
      expect(body.member.id).toBe(newGuestId);
    });

    it('링크 권한이 NONE이면 게스트를 만들지 않고 401을 반환한다', async () => {
      findBoard.mockResolvedValue(board('NONE'));

      await join({ boardToken: guestToken() }).expect(401);

      expect(createGuest).not.toHaveBeenCalled();
    });
  });

  describe('로그인 사용자', () => {
    const auth = `Bearer ${jwt.sign({ id: userId })}`;

    it('소유자는 링크 권한이 NONE이어도 사용자 참여자로 입장한다', async () => {
      findBoard.mockResolvedValue({ ...board('NONE'), ownerId: userId });

      const { body } = await join().set('Authorization', auth).expect(200);

      expect(body.member).toEqual({
        id: userMemberId,
        userId,
        type: 'USER',
        name: '유저',
        image: 'https://image.test/profile/a.jpg',
      });
      expect(upsertMember).toHaveBeenCalledWith({
        where: { boardId_userId: { boardId, userId } },
        create: { boardId, userId },
        update: {},
        select: { id: true },
      });
      expect(decodeBoardToken(body.boardToken)).toMatchObject({
        boardId,
        memberId: userMemberId,
        userId,
        type: 'USER',
        permission: 'EDIT',
      });
    });

    it('개별 초대로 권한을 받은 사용자는 링크 권한이 NONE이어도 입장한다', async () => {
      findBoard.mockResolvedValue(board('NONE'));
      findMember.mockResolvedValue({ id: userMemberId, permission: 'EDIT' });

      const { body } = await join().set('Authorization', auth).expect(200);

      expect(body.permission).toBe('EDIT');
      expect(findMember).toHaveBeenCalledWith({
        where: { boardId_userId: { boardId, userId } },
        select: { id: true, permission: true },
      });
    });

    it('링크로 들어와 참여 기록만 있는 사용자는 링크 권한이 NONE이면 403을 반환한다', async () => {
      findBoard.mockResolvedValue(board('NONE'));
      findMember.mockResolvedValue({ id: userMemberId, permission: null });

      await join().set('Authorization', auth).expect(403);

      expect(upsertMember).not.toHaveBeenCalled();
    });

    it('참여 기록이 없고 링크 권한이 NONE이면 403을 반환한다', async () => {
      findBoard.mockResolvedValue(board('NONE'));

      await join().set('Authorization', auth).expect(403);

      expect(upsertMember).not.toHaveBeenCalled();
    });

    it('링크 권한이 EDIT면 권한 없이 참여자로 기록하고 입장한다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));

      const { body } = await join().set('Authorization', auth).expect(200);

      expect(body.member.type).toBe('USER');
      expect(upsertMember.mock.calls[0][0].create).toEqual({ boardId, userId });
    });

    it('이 보드에 사용자 참여자가 없으면 이전 게스트를 사용자 참여자로 바꾼다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));
      convertGuest.mockResolvedValue({ count: 1 });
      upsertMember.mockResolvedValue({ id: guestId });

      const { body } = await join({ boardToken: guestToken({}, -10) })
        .set('Authorization', auth)
        .expect(200);

      expect(convertGuest).toHaveBeenCalledWith({
        where: { id: guestId, boardId, userId: null },
        data: { userId, name: null },
      });
      expect(deleteGuest).not.toHaveBeenCalled();
      expect(body.claimedGuestId).toBe(guestId);
      expect(body.member).toMatchObject({ id: guestId, userId, type: 'USER' });
      // 게스트 연결이 사용자 참여자 조회보다 먼저여야 게스트 행을 이어받는다.
      expect(convertGuest.mock.invocationCallOrder[0]).toBeLessThan(
        upsertMember.mock.invocationCallOrder[0],
      );
    });

    it('이미 사용자 참여자가 있으면 이전 게스트를 지워 합친다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));
      convertGuest.mockRejectedValue(uniqueError());
      deleteGuest.mockResolvedValue({ count: 1 });

      const { body } = await join({ boardToken: guestToken() })
        .set('Authorization', auth)
        .expect(200);

      expect(deleteGuest).toHaveBeenCalledWith({
        where: { id: guestId, boardId, userId: null },
      });
      expect(body.claimedGuestId).toBe(guestId);
      expect(body.member.id).toBe(userMemberId);
    });

    it('이미 계정에 연결된 게스트면 연결하지 않는다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));

      const { body } = await join({ boardToken: guestToken() })
        .set('Authorization', auth)
        .expect(200);

      expect(body.claimedGuestId).toBeNull();
      expect(body.member.id).toBe(userMemberId);
    });

    it.each([
      ['토큰 없음', undefined],
      ['다른 보드의 게스트 토큰', () => guestToken({ boardId: otherBoardId })],
    ])('%s이면 게스트를 연결하지 않는다', async (_, token) => {
      findBoard.mockResolvedValue(board('EDIT'));

      const { body } = await join(token ? { boardToken: token() } : {})
        .set('Authorization', auth)
        .expect(200);

      expect(body.claimedGuestId).toBeNull();
      expect(convertGuest).not.toHaveBeenCalled();
      expect(deleteGuest).not.toHaveBeenCalled();
    });

    it('웹 세션 쿠키로도 사용자 참여자로 입장한다', async () => {
      findBoard.mockResolvedValue(board('EDIT'));
      readCookie.mockReturnValue('session');
      authenticateRequest.mockResolvedValue({ userId });

      const { body } = await join().set('Cookie', 'session=test').expect(200);

      expect(body.member.userId).toBe(userId);
    });

    it.each(['Bearer invalid-token', 'Bearer', ''])(
      '유효하지 않은 헤더(%p)는 게스트로 바꾸지 않고 401을 반환한다',
      async (header) => {
        await join().set('Authorization', header).expect(401);

        expect(findBoard).not.toHaveBeenCalled();
      },
    );
  });
});
