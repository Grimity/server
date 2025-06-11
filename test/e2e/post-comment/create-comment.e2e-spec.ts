import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';

describe('POST /post-comments - 게시글 댓글 생성', () => {
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
      .post('/post-comments')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/post-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        postId: 'invalid',
        content: 'content',
      });

    // then
    expect(status).toBe(400);
  });

  it('content가 1자 미만일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/post-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        postId: '00000000-0000-0000-0000-000000000000',
        content: '    ',
      });

    // then
    expect(status).toBe(400);
  });

  it('parentCommentId가 있다면 UUID여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/post-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        postId: '00000000-0000-0000-0000-000000000000',
        content: 'content',
        parentCommentId: 'invalid',
      });

    // then
    expect(status).toBe(400);
  });

  it('mentionedUserId가 있다면 UUID여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/post-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        postId: '00000000-0000-0000-0000-000000000000',
        content: 'content',
        mentionedUserId: 'invalid',
      });

    // then
    expect(status).toBe(400);
  });

  it('게시글이 없는 경우 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/post-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        postId: '00000000-0000-0000-0000-000000000000',
        content: 'content',
      });

    // then
    expect(status).toBe(404);
  });

  it('201과 함께 댓글을 생성한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        type: 1,
        title: 'title',
        content: 'content',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/post-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        postId: post.id,
        content: 'content',
      });

    // then
    expect(status).toBe(201);
    expect(body).toEqual({
      id: expect.any(String),
    });
  });
});
