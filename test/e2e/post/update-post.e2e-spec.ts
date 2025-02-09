import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /posts/:id - 게시글 수정', () => {
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
      .put('/posts/1')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/posts/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'title',
        content: 'content',
        type: 'QUESTION',
      });

    // then
    expect(status).toBe(400);
  });

  it('title이 1글자 미만이거나 32글자 초과일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const [{ status: status1 }, { status: status2 }] = await Promise.all([
      request(app.getHttpServer())
        .put('/posts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '      ',
          content: 'content',
          type: 'QUESTION',
        }),
      request(app.getHttpServer())
        .put('/posts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'a'.repeat(33),
          content: 'content',
          type: 'QUESTION',
        }),
    ]);

    // then
    expect(status1).toBe(400);
    expect(status2).toBe(400);
  });

  it('content가 1글자 미만일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/posts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'title',
        content: '<p></p>',
        type: 'QUESTION',
      });

    // then
    expect(status).toBe(400);
  });

  it('type이 NORMAL, QUESTION, FEEDBACK이 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/posts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'title',
        content: 'content',
        type: 'INVALID',
      });

    // then
    expect(status).toBe(400);
  });

  it('없는 게시글일 때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/posts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'title',
        content: 'content',
        type: 'QUESTION',
      });

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 게시글을 수정한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'title',
        content: 'content',
        type: 1,
        hasImage: false,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'new title',
        content: 'new content',
        type: 'QUESTION',
      });

    // then
    expect(status).toBe(204);
    const updatedPost = await prisma.post.findFirstOrThrow();
    expect(updatedPost).toEqual({
      id: post.id,
      authorId: user.id,
      title: 'new title',
      content: 'new content',
      type: 2,
      hasImage: false,
      createdAt: expect.any(Date),
      commentCount: 0,
      viewCount: 0,
    });
  });

  it('자신이 작성한 게시글이 아닐 때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        name: 'test2',
        email: 'test@test.com',
      },
    });

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'title',
        content: 'content',
        type: 1,
        hasImage: false,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'new title',
        content: 'new content',
        type: 'QUESTION',
      });

    // then
    expect(status).toBe(404);
  });
});
