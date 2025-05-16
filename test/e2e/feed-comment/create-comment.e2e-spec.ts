import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('POST /feed-comments - 피드 댓글 생성', () => {
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
      .post('/feed-comments')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        feedId: '1',
        content: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('content가 없을 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: '',
        feedId: '00000000-0000-0000-0000-000000000000',
        parentCommentId: null,
      });

    // then
    expect(status).toBe(400);
  });

  it('parentCommentId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'test',
        feedId: '00000000-0000-0000-0000-000000000000',
        parentCommentId: '1',
      });

    // then
    expect(status).toBe(400);
  });

  it('201과 함께 댓글을 생성한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const user = await prisma.user.findFirstOrThrow();
    const feed = await prisma.feed.create({
      data: {
        content: 'test',
        authorId: user.id,
        title: 'test',
        cards: ['feed/test.png'],
        thumbnail: 'feed/test.png',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'test',
        feedId: feed.id,
        parentCommentId: null,
        mentionedUserId: user.id,
      });

    // then
    expect(status).toBe(201);
    const feedComment = await prisma.feedComment.findMany();
    expect(feedComment).toHaveLength(1);
  });

  it('대댓도 생성한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const user = await prisma.user.findFirstOrThrow();
    const feed = await prisma.feed.create({
      data: {
        content: 'test',
        authorId: user.id,
        title: 'test',
        cards: ['feed/test.png'],
        thumbnail: 'feed/test.png',
      },
    });
    const parentComment = await prisma.feedComment.create({
      data: {
        content: 'test',
        feedId: feed.id,
        writerId: user.id,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'test',
        feedId: feed.id,
        parentCommentId: parentComment.id,
      });

    // then
    expect(status).toBe(201);
    const feedComment = await prisma.feedComment.findMany({
      where: {
        parentId: parentComment.id,
      },
    });
    expect(feedComment).toHaveLength(1);
  });

  it('feedId가 존재하지 않을 때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'test',
        feedId: '00000000-0000-0000-0000-000000000000',
        parentCommentId: null,
      });

    // then
    expect(status).toBe(404);
  });

  it('부모 댓글이 존재하지 않을 때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const feed = await prisma.feed.create({
      data: {
        content: 'test',
        authorId: user.id,
        title: 'test',
        cards: ['feed/test.png'],
        thumbnail: 'feed/test.png',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'test',
        feedId: feed.id,
        parentCommentId: '00000000-0000-0000-0000-000000000000',
      });

    // then
    expect(status).toBe(404);
  });
});
