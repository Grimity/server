import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';

describe('GET /posts/today-popular - 오늘의 인기 게시글 조회', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await redis.flushall();
  });

  afterAll(async () => {
    await app.close();
  });

  it('200과 함께 오늘의 인기 게시글 목록을 조회한다', async () => {
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
          viewCount: i,
          type: 1,
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      '/posts/today-popular',
    );

    // then
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThanOrEqual(12);
    expect(body[0]).toEqual({
      id: expect.any(String),
      title: 'test19',
      type: 'NORMAL',
      content: 'test19',
      thumbnail: null,
      viewCount: 19,
      commentCount: 0,
      createdAt: expect.any(String),
      author: {
        id: expect.any(String),
        name: 'test',
      },
    });
  });
});
