import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /feeds/latest - 최신 피드 조회', () => {
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

  it('로그인유저, 좋아요유무, 커서', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        isAI: false,
        likeCount: 1,
        thumbnail: 'test',
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
        comments: {
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
          thumbnail: 'test',
          likeCount: 0,
          cards: [],
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/feeds/latest?size=12`)
      .set('Authorization', `Bearer ${accessToken}`);

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/feeds/latest?cursor=${body.nextCursor}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(200);
    expect(status2).toBe(200);
    expect(body.feeds).toHaveLength(12);
    expect(body2.feeds).toHaveLength(4);
    expect(body2.feeds[3]).toEqual({
      id: feed.id,
      title: 'test',
      createdAt: expect.any(String),
      viewCount: 0,
      likeCount: 1,
      thumbnail: 'test',
      isLike: true,
      author: {
        id: user.id,
        name: 'test',
        image: null,
      },
    });
    expect(body2.nextCursor).toBeNull();
  });

  it('비로그인유저', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
        url: 'test',
        feeds: {
          create: {
            title: 'test',
            content: 'test',
            isAI: false,
            likeCount: 0,
            cards: [],
            thumbnail: 'test',
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
          thumbnail: 'test',
          cards: [],
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/feeds/latest?size=13`,
    );

    // then
    expect(status).toBe(200);
    expect(body.cursor).not.toBeNull();
    expect(body.feeds).toHaveLength(13);
  });
});
