import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /notifications - 전체알림 읽음 처리', () => {
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

  it('204와 함께 전체 알림을 읽음 처리 한다', async () => {
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
          userId: user1.id,
          actorId: user2.id,
          type: 'FOLLOW',
        },
        {
          userId: user1.id,
          actorId: user2.id,
          type: 'LIKE',
        },
      ],
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put('/notifications')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const notifications = await prisma.notification.findMany();
    expect(notifications.every((n) => n.isRead)).toBe(true);

    // cleanup
    spy.mockRestore();
  });
});
