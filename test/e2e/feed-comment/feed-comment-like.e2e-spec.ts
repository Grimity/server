import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('PUT /feed-comments/:id/like - 피드 댓글 좋아요', () => {
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
    await prisma.feedComment.deleteMany();
    await prisma.feedCommentLike.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .put('/feed-comments/1/like')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('댓글 id가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/feed-comments/1/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('없는 댓글일 때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/feed-comments/00000000-0000-0000-0000-000000000000/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 좋아요를 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        email: 'test@test.com',
        name: 'test2',
        url: 'test2',
      },
    });
    const feed = await prisma.feed.create({
      data: {
        title: 'test',
        content: 'test',
        authorId: user.id,
        thumbnail: 'feed/test.png',
      },
    });
    const comment = await prisma.feedComment.create({
      data: {
        writerId: user.id,
        feedId: feed.id,
        content: 'test',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/feed-comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const like = await prisma.feedCommentLike.findFirst();
    expect(like).not.toBeNull();
    const afterComment = await prisma.feedComment.findFirstOrThrow();
    expect(afterComment.likeCount).toBe(1);
  });
});
