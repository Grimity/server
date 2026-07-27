import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /users/:id/feeds - 유저별 피드조회', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('userId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/123/feeds')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('size가 숫자가 아닐때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000/feeds?size=abc')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('sort는 latest, like, oldest 중 하나여야 한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000/feeds?sort=abc')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('albumId는 UUID 형식이어야 한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000/feeds?albumId=INVALID')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 피드를 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        email: 'test@test.com',
        name: 'test',
        url: 'test',
      },
    });

    await prisma.feed.createMany({
      data: new Array(15).fill(0).map((_, index) => ({
        authorId: user.id,
        title: `title${index}`,
        content: `content${index}`,
        thumbnail: 'test',
        createdAt: new Date(2021, 1, index + 1),
      })),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${user.id}/feeds?size=12`)
      .send();

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/users/${user.id}/feeds?cursor=${body.nextCursor}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(status2).toBe(200);
    expect(body.feeds.length).toBe(12);
    expect(body2.feeds.length).toBe(3);
    expect(body2.feeds[0].title).toBe('title2');
    expect(body2.nextCursor).toBeNull();
  });

  it('200과 함께 피드를 반환한다 - albumId가 있을 때', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        email: 'test@test.com',
        name: 'test',
        url: 'test',
      },
    });

    const album = await prisma.album.create({
      data: {
        userId: user.id,
        name: 'test1',
        order: 1,
      },
    });

    await prisma.feed.createMany({
      data: new Array(15).fill(0).map((_, index) => ({
        authorId: user.id,
        title: `title${index}`,
        content: `content${index}`,
        thumbnail: 'test',
        albumId: album.id,
        createdAt: new Date(2021, 1, index + 1),
      })),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${user.id}/feeds?size=12&albumId=${album.id}`)
      .send();
    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(
        `/users/${user.id}/feeds?albumId=00000000-0000-0000-0000-000000000000`,
      )
      .send();

    // then
    expect(status).toBe(200);
    expect(status2).toBe(200);
    expect(body.feeds.length).toBe(12);
    expect(body2.feeds.length).toBe(0);
  });

  it('비로그인 요청이면 isLike는 모두 false다', async () => {
    // given
    const author = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'author',
        email: 'test@test.com',
        name: 'author',
        url: 'author',
      },
    });

    const feed = await prisma.feed.create({
      data: {
        authorId: author.id,
        title: 'title',
        content: 'content',
        thumbnail: 'test',
      },
    });

    const liker = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'liker',
        email: 'test@test.com',
        name: 'liker',
        url: 'liker',
      },
    });

    await prisma.like.create({
      data: {
        userId: liker.id,
        feedId: feed.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${author.id}/feeds`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.feeds).toHaveLength(1);
    expect(body.feeds[0].isLike).toBe(false);
  });

  it('로그인 요청이면 내가 좋아요한 피드만 isLike가 true다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const author = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'author',
        email: 'test@test.com',
        name: 'author',
        url: 'author',
      },
    });

    const likedFeed = await prisma.feed.create({
      data: {
        authorId: author.id,
        title: 'liked',
        content: 'content',
        thumbnail: 'test',
        createdAt: new Date(2021, 1, 2),
      },
    });

    const notLikedFeed = await prisma.feed.create({
      data: {
        authorId: author.id,
        title: 'notLiked',
        content: 'content',
        thumbnail: 'test',
        createdAt: new Date(2021, 1, 1),
      },
    });

    await prisma.like.create({
      data: {
        userId: user.id,
        feedId: likedFeed.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${author.id}/feeds`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.feeds).toHaveLength(2);
    expect(
      body.feeds.find((feed: any) => feed.id === likedFeed.id).isLike,
    ).toBe(true);
    expect(
      body.feeds.find((feed: any) => feed.id === notLikedFeed.id).isLike,
    ).toBe(false);
  });
});
