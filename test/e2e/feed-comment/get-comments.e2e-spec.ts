import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';

describe('GET /feed-comments?feedId={feedId}', () => {
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

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get(
      '/feed-comments?feedId=1',
    );

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 댓글 목록을 반환한다', async () => {
    // given
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
        title: 'test',
      },
    });

    const parentComment = await prisma.feedComment.create({
      data: {
        writerId: user.id,
        feedId: feed.id,
        content: 'test',
      },
    });

    await prisma.feedComment.createMany({
      data: [
        {
          writerId: user.id,
          feedId: feed.id,
          parentId: null,
          content: 'test2',
        },
        {
          writerId: user.id,
          feedId: feed.id,
          parentId: parentComment.id,
          content: 'test3',
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/feed-comments?feedId=${feed.id}`,
    );

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      comments: [
        {
          id: parentComment.id,
          parentId: null,
          content: 'test',
          createdAt: expect.any(String),
          writer: {
            id: user.id,
            name: 'test',
            image: null,
          },
          childComments: [
            {
              id: expect.any(String),
              parentId: parentComment.id,
              content: 'test3',
              createdAt: expect.any(String),
              writer: {
                id: user.id,
                name: 'test',
                image: null,
              },
            },
          ],
        },
        {
          id: expect.any(String),
          parentId: null,
          content: 'test2',
          createdAt: expect.any(String),
          writer: {
            id: user.id,
            name: 'test',
            image: null,
          },
          childComments: [],
        },
      ],
      commentCount: 3,
    });
  });
});
