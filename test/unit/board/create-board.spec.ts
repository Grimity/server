import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TransactionHost } from '@nestjs-cls/transactional';
import * as request from 'supertest';
import { globalPipe } from 'src/core/pipe/global.pipe';
import { WebSessionService } from 'src/module/auth/web-session.service';
import { BoardModule } from 'src/module/board/board.module';

describe('POST /boards', () => {
  let app: INestApplication;
  const userId = '357c2503-30ea-4a48-95c0-2651428a37d3';
  const boardId = '6ab964c5-bc5b-4a8f-9dc7-c11cad940b49';
  const jwt = new JwtService({ secret: 'board-test-secret' });
  const create = jest.fn().mockResolvedValue({ id: boardId });
  const authenticateRequest = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [BoardModule],
      providers: [globalPipe],
    })
      .useMocker((token) => {
        if (token === TransactionHost) {
          return { tx: { board: { create } } };
        }
        if (token === JwtService) return jwt;
        if (token === WebSessionService) return { authenticateRequest };
        if (token === ConfigService) return { getOrThrow: () => 'secret' };
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    create.mockClear();
    authenticateRequest.mockReset();
    authenticateRequest.mockRejectedValue(new UnauthorizedException());
  });

  afterAll(async () => {
    await app.close();
  });

  it('인증 정보가 없으면 보드를 생성하지 않고 401을 반환한다', async () => {
    await request(app.getHttpServer()).post('/boards').expect(401);

    expect(create).not.toHaveBeenCalled();
  });

  it('유효하지 않은 토큰이면 보드를 생성하지 않고 401을 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/boards')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(create).not.toHaveBeenCalled();
  });

  it('요청 본문 없이 기본값으로 생성하고 소유자와 EDIT 권한의 멤버를 등록한다', async () => {
    await request(app.getHttpServer())
      .post('/boards')
      .set('Authorization', `Bearer ${jwt.sign({ id: userId })}`)
      .expect(201, { id: boardId });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        ownerId: userId,
        members: { create: { userId, permission: 'EDIT' } },
      },
      select: { id: true },
    });
  });

  it.each([
    {},
    {
      title: '사용자가 지정한 제목',
      linkPermission: 'NONE',
      ownerId: 'someone-else',
      members: [{ userId: 'someone-else', permission: 'NONE' }],
      permission: 'NONE',
    },
  ])(
    '본문을 보내도 생성 기본값과 소유자 권한을 변경하지 않는다: %p',
    async (body) => {
      await request(app.getHttpServer())
        .post('/boards')
        .set('Authorization', `Bearer ${jwt.sign({ id: userId })}`)
        .send(body)
        .expect(201, { id: boardId });

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        data: {
          ownerId: userId,
          members: { create: { userId, permission: 'EDIT' } },
        },
        select: { id: true },
      });
    },
  );

  it('기존 웹 세션 인증으로도 요청 본문 없이 보드를 생성한다', async () => {
    authenticateRequest.mockResolvedValue({ userId });

    await request(app.getHttpServer())
      .post('/boards')
      .set('Cookie', 'session=test')
      .expect(201, { id: boardId });

    expect(authenticateRequest).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        ownerId: userId,
        members: { create: { userId, permission: 'EDIT' } },
      },
      select: { id: true },
    });
  });
});
