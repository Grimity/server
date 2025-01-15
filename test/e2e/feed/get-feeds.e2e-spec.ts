import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /feeds', () => {
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

  it('로그인유저, 좋아요유무, 커서', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        isAI: false,
        likeCount: 1,
        cards: [],
        tags: {
          createMany: {
            data: [{ tagName: 'test' }],
          },
        },
        likes: {
          create: {
            userId: user.id,
          },
        },
        feedComments: {
          create: {
            writerId: user.id,
            content: 'test',
          },
        },
      },
    });

    await prisma.feed.createMany({
      data: new Array(15).fill(0).map(() => {
        return {
          authorId: user.id,
          title: 'test',
          content: 'test',
          isAI: false,
          likeCount: 0,
          cards: [],
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/feeds`)
      .set('Authorization', `Bearer ${accessToken}`);

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/feeds?lastId=${body[11].id}&lastCreatedAt=${body[11].createdAt}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(200);
    expect(status2).toBe(200);
    expect(body).toHaveLength(12);
    expect(body2).toHaveLength(4);
    expect(body2[3]).toEqual({
      id: feed.id,
      title: 'test',
      cards: [],
      createdAt: expect.any(String),
      viewCount: 0,
      likeCount: 1,
      commentCount: 1,
      isLike: true,
      author: {
        id: user.id,
        name: 'test',
        image: null,
      },
    });

    // cleanup
    spy.mockRestore();
  });

  it('비로그인유저, 태그검색', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
        feeds: {
          create: {
            title: 'test',
            content: 'test',
            isAI: false,
            likeCount: 0,
            cards: [],
            tags: {
              createMany: {
                data: [{ tagName: '테스트용 태그임' }],
              },
            },
          },
        },
      },
    });

    await prisma.feed.createMany({
      data: new Array(15).fill(0).map(() => {
        return {
          authorId: user.id,
          title: 'test2',
          content: 'test2',
          isAI: false,
          likeCount: 0,
          cards: [],
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/feeds?tag=스트`,
    );

    // then
    expect(status).toBe(200);
    expect(body).toEqual([
      {
        id: expect.any(String),
        title: 'test',
        cards: [],
        createdAt: expect.any(String),
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        isLike: false,
        author: {
          id: user.id,
          name: 'test',
          image: null,
        },
      },
    ]);
  });
});
