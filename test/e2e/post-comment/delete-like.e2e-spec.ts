import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('DELETE /post-comments/:id/like - 게시판 댓글 좋아요 취소', () => {
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

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).delete(
      '/post-comments/1/like',
    );

    // then
    expect(status).toBe(401);
  });

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/post-comments/1/like')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(400);
  });

  it('없는 댓글일 때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/post-comments/00000000-0000-0000-0000-000000000000/like')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(404);
  });

  it('좋아요하지 않은 댓글일 때도 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    const comment = await prisma.postComment.create({
      data: {
        writerId: user.id,
        postId: post.id,
        content: 'test',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/post-comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 좋아요를 취소한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    const comment = await prisma.postComment.create({
      data: {
        writerId: user.id,
        postId: post.id,
        content: 'test',
      },
    });

    await request(app.getHttpServer())
      .put(`/post-comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/post-comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const [updatedComment, like] = await Promise.all([
      prisma.postComment.findFirstOrThrow(),
      prisma.postCommentLike.findFirst(),
    ]);
    expect(updatedComment.likeCount).toBe(0);
    expect(like).toBeNull();
  });
});
