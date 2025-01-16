import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /notifications', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get('/notifications');

    // then
    expect(status).toBe(401);
  });

  it('유저의 모든 알림을 가져온다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    const [user1, user2] = await Promise.all([
      prisma.user.findFirstOrThrow(),
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          email: 'test@test.com',
          name: 'test2',
        },
      }),
    ]);

    await prisma.notification.createMany({
      data: [
        {
          actorId: user2.id,
          type: 'LIKE',
          userId: user1.id,
          createdAt: new Date(new Date().getTime() - 1000),
        },
        {
          actorId: user2.id,
          type: 'LIKE',
          userId: user1.id,
          createdAt: new Date(new Date().getTime() - 500),
          isRead: true,
        },
        {
          actorId: user2.id,
          type: 'LIKE',
          userId: user1.id,
          createdAt: new Date(),
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(3);
    expect(body).toEqual([
      {
        id: expect.any(String),
        actor: {
          id: user2.id,
          name: user2.name,
        },
        refId: null,
        type: 'LIKE',
        isRead: false,
        createdAt: expect.any(String),
      },
      {
        id: expect.any(String),
        actor: {
          id: user2.id,
          name: user2.name,
        },
        refId: null,
        type: 'LIKE',
        isRead: true,
        createdAt: expect.any(String),
      },
      {
        id: expect.any(String),
        actor: {
          id: user2.id,
          name: user2.name,
        },
        refId: null,
        type: 'LIKE',
        isRead: false,
        createdAt: expect.any(String),
      },
    ]);

    // cleanup
    spy.mockRestore();
  });
});
