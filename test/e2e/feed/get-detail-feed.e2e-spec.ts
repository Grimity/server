import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';
import { getImageUrl } from 'src/shared/util/get-image-url';

describe('GET /feeds/:feedId - 피드 상세', () => {
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

  it('200과 함께 피드를 반환한다 (비 로그인 상태)', async () => {
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
        url: 'test',
      },
    });

    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'title',
        content: 'content',
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
      cards: [getImageUrl('feed/test.jpg')],
      thumbnail: getImageUrl('feed/test.jpg'),
      createdAt: expect.any(String),
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      content: 'content',
      tags: ['tag1', 'tag2'],
      author: {
        id: user.id,
        name: 'test',
        image: null,
        url: 'test',
      },
      isLike: false,
      isSave: false,
      album: null,
    });
  });

  it('200과 함께 피드를 반환한다 (로그인 상태)', async () => {
    // given
    const accessToken = await register(app, 'test');

    const [user1, user2] = await Promise.all([
      prisma.user.findFirstOrThrow(),
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          name: 'test2',
          email: 'test@test.com',
          url: 'test2',
        },
      }),
    ]);

    const album = await prisma.album.create({
      data: {
        name: 'test1',
        order: 1,
        userId: user1.id,
      },
    });

    const feed = await prisma.feed.create({
      data: {
        authorId: user2.id,
        title: 'title',
        content: 'content',
        cards: ['feed/test.jpg'],
        thumbnail: 'feed/test.jpg',
        tags: {
          createMany: {
            data: [{ tagName: 'tag1' }, { tagName: 'tag2' }],
          },
        },
        albumId: album.id,
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
      cards: [getImageUrl('feed/test.jpg')],
      thumbnail: getImageUrl('feed/test.jpg'),
      createdAt: expect.any(String),
      viewCount: 0,
      likeCount: 1,
      commentCount: 0,
      content: 'content',
      tags: ['tag1', 'tag2'],
      author: {
        id: user2.id,
        name: 'test2',
        image: null,
        url: 'test2',
      },
      isLike: true,
      isSave: false,
      album: {
        id: album.id,
        name: album.name,
      },
    });
  });
});
