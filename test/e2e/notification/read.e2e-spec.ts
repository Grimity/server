import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /notifications/:id', () => {
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
    const { status } = await request(app.getHttpServer()).put(
      '/notifications/00000000-0000-0000-0000-000000000000',
    );

    // then
    expect(status).toBe(401);
  });

  it('id가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/notifications/1')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('없는 알림일 때 404를 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/notifications/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(404);

    // cleanup
    spy.mockRestore();
  });

  it('204와 함께 알림을 읽음 처리한다', async () => {
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

    const notification = await prisma.notification.create({
      data: {
        userId: user1.id,
        actorId: user2.id,
        type: 'LIKE',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/notifications/${notification.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const updatedNotification = await prisma.notification.findFirstOrThrow();
    expect(updatedNotification.isRead).toBe(true);

    // cleanup
    spy.mockRestore();
  });
});
