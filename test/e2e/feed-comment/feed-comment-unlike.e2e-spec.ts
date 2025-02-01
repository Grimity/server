import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('DELETE /feed-comments/:id/unlike - 피드 댓글 좋아요 취소', () => {
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
    await prisma.feedComment.deleteMany();
    await prisma.feedCommentLike.deleteMany();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feed-comments/1/like')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('댓글 id가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feed-comments/1/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('좋아요가 존재하지 않을 때 404를 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feed-comments/00000000-0000-0000-0000-000000000000/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);

    // cleanup
    spy.mockRestore();
  });

  it('204와 함께 좋아요를 취소한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        email: 'test@test.com',
        name: 'test2',
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

    await request(app.getHttpServer())
      .put(`/feed-comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/feed-comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const like = await prisma.feedCommentLike.findFirst();
    expect(like).toBeNull();
    const afterComment = await prisma.feedComment.findFirstOrThrow();
    expect(afterComment.likeCount).toBe(0);

    // cleanup
    spy.mockRestore();
  });
});
