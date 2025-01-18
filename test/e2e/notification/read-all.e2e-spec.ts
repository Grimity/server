import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';
import { v4 as uuid } from 'uuid';

describe('PUT /notifications - 전체 알림 읽음 처리', () => {
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
    await prisma.notification.deleteMany();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .put('/notifications')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 전체 알림을 읽음 처리 한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: '1234',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    await prisma.notification.createMany({
      data: [
        {
          id: uuid(),
          userId: user.id,
          type: 'LIKE',
          actorId: uuid(),
          actorName: 'test',
          feedId: uuid(),
        },
        {
          id: uuid(),
          userId: user.id,
          type: 'COMMENT',
          actorId: uuid(),
          actorName: 'test',
          feedId: uuid(),
        },
      ],
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put('/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const notifications = await prisma.notification.findMany();
    expect(notifications.every((notification) => notification.isRead)).toBe(
      true,
    );

    // cleanup
    spy.mockRestore();
  });
});
