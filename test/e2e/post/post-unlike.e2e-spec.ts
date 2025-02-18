import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('DELETE /posts/:id/like - 게시글 좋아요 취소', () => {
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
    const { status } = await request(app.getHttpServer())
      .delete('/posts/1/like')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/posts/1/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('좋아요 한 적이 없는경우 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/posts/00000000-0000-0000-0000-000000000000/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 like를 취소한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'title',
        content: 'content',
        type: 1,
      },
    });

    await request(app.getHttpServer())
      .put(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);

    const like = await prisma.postLike.findFirst({
      where: {
        postId: post.id,
        userId: user.id,
      },
    });
    expect(like).toBeNull();
  });
});
