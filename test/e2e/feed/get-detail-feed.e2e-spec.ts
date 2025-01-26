import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /feeds/:feedId', () => {
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

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/feeds/1')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('feedId에 해당하는 피드가 없을 때 404를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/feeds/00000000-0000-0000-0000-000000000000')
      .send();

    // then
    expect(status).toBe(404);
  });

  it('200과 함께 피드를 반환한다', async () => {
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
      },
    });

    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'title',
        content: 'content',
        isAI: false,
        cards: ['feed/test.jpg'],
        thumbnail: 'feed/test.jpg',
        tags: {
          createMany: {
            data: [{ tagName: 'tag1' }, { tagName: 'tag2' }],
          },
        },
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/feeds/${feed.id}`,
    );

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      id: feed.id,
      title: 'title',
      cards: ['feed/test.jpg'],
      thumbnail: 'feed/test.jpg',
      isAI: false,
      createdAt: expect.any(String),
      viewCount: 0,
      likeCount: 0,
      content: 'content',
      tags: ['tag1', 'tag2'],
      author: {
        id: user.id,
        name: 'test',
        image: null,
        followerCount: 0,
        isFollowing: false,
      },
      isLike: false,
    });
  });

  it('200과 함께 피드를 반환한다 (로그인 상태)', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    const [, user2] = await Promise.all([
      prisma.user.findFirstOrThrow(),
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          name: 'test2',
          email: 'test@test.com',
        },
      }),
    ]);

    const feed = await prisma.feed.create({
      data: {
        authorId: user2.id,
        title: 'title',
        content: 'content',
        isAI: false,
        cards: ['feed/test.jpg'],
        thumbnail: 'feed/test.jpg',
        tags: {
          createMany: {
            data: [{ tagName: 'tag1' }, { tagName: 'tag2' }],
          },
        },
      },
    });

    await Promise.all([
      request(app.getHttpServer())
        .put(`/feeds/${feed.id}/like`)
        .set('Authorization', `Bearer ${accessToken}`),
      request(app.getHttpServer())
        .put(`/users/${user2.id}/follow`)
        .set('Authorization', `Bearer ${accessToken}`),
    ]);

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/feeds/${feed.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      id: feed.id,
      title: 'title',
      cards: ['feed/test.jpg'],
      thumbnail: 'feed/test.jpg',
      isAI: false,
      createdAt: expect.any(String),
      viewCount: 0,
      likeCount: 1,
      content: 'content',
      tags: ['tag1', 'tag2'],
      author: {
        id: user2.id,
        name: 'test2',
        image: null,
        followerCount: 1,
        isFollowing: true,
      },
      isLike: true,
    });

    // cleanup
    spy.mockRestore();
  });
});
