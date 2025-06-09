import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { register } from '../helper/register';
import { AuthService } from 'src/module/auth/auth.service';

describe('GET /feed-comments?feedId={feedId} - 피드 댓글 조회', () => {
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
    const { status } = await request(app.getHttpServer()).get(
      '/feed-comments?feedId=1',
    );

    // then
    expect(status).toBe(400);
  });

  it('피드에 댓글이 없을 때 빈 배열을 반환한다', async () => {
    // given
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
        thumbnail: 'test',
        authorId: user.id,
        title: 'test',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/feed-comments?feedId=${feed.id}`,
    );

    // then
    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it('200과 함께 댓글 목록을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'me');

    const [me, user] = await Promise.all([
      prisma.user.findFirstOrThrow({ where: { name: 'me' } }),
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          name: 'test',
          email: 'test@test.com',
          url: 'test2',
        },
      }),
    ]);

    const feed = await prisma.feed.create({
      data: {
        thumbnail: 'test',
        authorId: user.id,
        title: 'test',
      },
    });

    const [parent1, parent2] = await prisma.feedComment.createManyAndReturn({
      data: [
        {
          writerId: user.id,
          feedId: feed.id,
          content: 'parent1',
          createdAt: new Date('2023-01-01'),
        },
        {
          writerId: user.id,
          feedId: feed.id,
          content: 'parent2',
          createdAt: new Date('2023-01-02'),
        },
      ],
    });

    const [child1, child2, child3] =
      await prisma.feedComment.createManyAndReturn({
        data: [
          {
            writerId: user.id,
            feedId: feed.id,
            parentId: parent1.id,
            likeCount: 1,
            content: 'child1',
            createdAt: new Date('2023-01-03'),
          },
          {
            writerId: user.id,
            feedId: feed.id,
            parentId: parent1.id,
            content: 'child2',
            createdAt: new Date('2023-01-04'),
          },
          {
            writerId: user.id,
            feedId: feed.id,
            parentId: parent2.id,
            content: 'child3',
            createdAt: new Date('2023-01-05'),
          },
        ],
      });

    await prisma.feedCommentLike.create({
      data: {
        userId: me.id,
        feedCommentId: child1.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/feed-comments?feedId=${feed.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(200);
    expect(body).toEqual([
      {
        id: parent1.id,
        content: 'parent1',
        createdAt: '2023-01-01T00:00:00.000Z',
        likeCount: 0,
        writer: {
          id: user.id,
          name: 'test',
          image: null,
          url: 'test2',
        },
        isLike: false,
        childComments: [
          {
            id: child1.id,
            content: 'child1',
            createdAt: '2023-01-03T00:00:00.000Z',
            likeCount: 1,
            writer: {
              id: user.id,
              name: 'test',
              image: null,
              url: 'test2',
            },
            isLike: true,
            mentionedUser: null,
          },
          {
            id: child2.id,
            content: 'child2',
            createdAt: '2023-01-04T00:00:00.000Z',
            likeCount: 0,
            writer: {
              id: user.id,
              name: 'test',
              image: null,
              url: 'test2',
            },
            isLike: false,
            mentionedUser: null,
          },
        ],
      },
      {
        id: parent2.id,
        content: 'parent2',
        createdAt: '2023-01-02T00:00:00.000Z',
        likeCount: 0,
        writer: {
          id: user.id,
          name: 'test',
          image: null,
          url: 'test2',
        },
        isLike: false,
        childComments: [
          {
            id: child3.id,
            content: 'child3',
            createdAt: '2023-01-05T00:00:00.000Z',
            likeCount: 0,
            writer: {
              id: user.id,
              name: 'test',
              image: null,
              url: 'test2',
            },
            isLike: false,
            mentionedUser: null,
          },
        ],
      },
    ]);
  });
});
