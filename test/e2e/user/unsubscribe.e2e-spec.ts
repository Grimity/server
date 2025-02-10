import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('DELETE /users/me/subscribe - 구독 취소', () => {
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

    jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/me/subscribe')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('리스트에 없는 type을 보내면 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/me/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        type: 'INVALID',
      });

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 구독을 취소한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    await prisma.user.updateMany({
      data: {
        subscription: [
          'FOLLOW',
          'FEED_LIKE',
          'FEED_COMMENT',
          'FEED_REPLY',
          'POST_COMMENT',
          'POST_REPLY',
        ],
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/me/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        type: 'FEED_LIKE',
      });

    // then
    expect(status).toBe(204);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.subscription).toEqual([
      'FOLLOW',
      'FEED_COMMENT',
      'FEED_REPLY',
      'POST_COMMENT',
      'POST_REPLY',
    ]);
  });

  it('ALL을 보내면 모든 구독을 취소한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    await prisma.user.updateMany({
      data: {
        subscription: [
          'FOLLOW',
          'FEED_LIKE',
          'FEED_COMMENT',
          'FEED_REPLY',
          'POST_COMMENT',
          'POST_REPLY',
        ],
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/me/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        type: 'ALL',
      });

    // then
    expect(status).toBe(204);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.subscription).toEqual([]);
  });
});
