import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /posts - 게시글 조회', () => {
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

  it('type은 ALL, QUESTION, FEEDBACK 중 하나여야 한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/posts')
      .query({ type: 'INVALID' });

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 게시글 목록을 조회한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        email: 'test@test.com',
        name: 'test',
      },
    });

    await prisma.post.createMany({
      data: Array.from({ length: 20 }).map((_, i) => {
        return {
          authorId: user.id,
          title: `test${i}`,
          content: `test${i}`,
          type: 1,
          hasImage: false,
          createdAt: new Date(Date.now() - i * 1000),
        };
      }),
    });

    await prisma.post.createMany({
      data: [
        {
          authorId: user.id,
          title: 'question',
          content: 'test',
          type: 2,
          hasImage: false,
        },
        {
          authorId: user.id,
          title: 'notice',
          content: 'test',
          type: 0,
          hasImage: false,
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/posts')
      .query({ type: 'ALL', page: 1, size: 15 });
    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get('/posts')
      .query({ type: 'ALL', page: 2, size: 15 });
    const { status: status3, body: body3 } = await request(app.getHttpServer())
      .get('/posts')
      .query({ type: 'QUESTION', page: 1, size: 15 });

    // then
    expect(status).toBe(200);
    expect(body.totalCount).toBe(21);
    expect(body.posts.length).toBe(15);
    expect(body.posts[0]).toEqual({
      id: expect.any(String),
      title: 'question',
      content: 'test',
      hasImage: false,
      commentCount: 0,
      viewCount: 0,
      type: 'QUESTION',
      createdAt: expect.any(String),
      author: {
        id: user.id,
        name: 'test',
      },
    });

    expect(status2).toBe(200);
    expect(body2.totalCount).toBe(21);
    expect(body2.posts.length).toBe(6);

    expect(status3).toBe(200);
    expect(body3.totalCount).toBe(1);
    expect(body3.posts.length).toBe(1);
    expect(body3.posts[0]).toEqual({
      id: expect.any(String),
      title: 'question',
      content: 'test',
      hasImage: false,
      commentCount: 0,
      viewCount: 0,
      type: 'QUESTION',
      createdAt: expect.any(String),
      author: {
        id: user.id,
        name: 'test',
      },
    });
  });
});
