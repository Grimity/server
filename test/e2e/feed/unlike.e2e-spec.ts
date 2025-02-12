import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('DELETE /feeds/:feedId/like - 피드 좋아요 취소', () => {
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

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feeds/1/like')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feeds/1/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('204와 함께 unlike를 한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        isAI: false,
        cards: ['feed/test.jpg'],
        thumbnail: 'feed/test.jpg',
      },
    });

    await request(app.getHttpServer())
      .put(`/feeds/${feed.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // when

    const { status } = await request(app.getHttpServer())
      .delete(`/feeds/${feed.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const [like, afterFeed] = await Promise.all([
      prisma.like.findFirst({
        where: {
          userId: user.id,
        },
      }),
      prisma.feed.findUnique({
        where: {
          id: feed.id,
        },
      }),
    ]);
    expect(like).toBeNull();
    expect(afterFeed?.likeCount).toBe(0);

    // cleanup
    spy.mockRestore();
  });

  it('없는 피드에 unlike를 하면 404를 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feeds/00000000-0000-0000-0000-000000000000/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);

    // cleanup
    spy.mockRestore();
  });
});
