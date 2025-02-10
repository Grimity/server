import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';
import { v4 as uuid } from 'uuid';

describe('DELETE /notifications - 전체 알림 삭제', () => {
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
      .delete('/notifications')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 전체 알림을 삭제한다', async () => {
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
          data: {
            type: 'FEED_COMMENT',
            feedId: uuid(),
            actor: {
              id: uuid(),
              name: 'test',
            },
          },
        },
        {
          id: uuid(),
          userId: user.id,
          data: {
            type: 'FEED_ANSWER',
            feedId: uuid(),
            actor: {
              id: uuid(),
              name: 'test',
            },
          },
        },
      ],
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const notifications = await prisma.notification.findMany();
    expect(notifications).toHaveLength(0);

    // cleanup
    spy.mockRestore();
  });
});
