import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';

describe('GET /feeds/today-popular - 오늘의 인기 그림 조회', () => {
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

  it('200과 함께 인기 피드 목록을 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        email: 'test@test.com',
        name: 'test',
      },
    });

    await prisma.feed.createMany({
      data: Array.from({ length: 20 }).map((_, i) => {
        return {
          authorId: user.id,
          title: `test${i}`,
          content: `test${i}`,
          isAI: false,
          likeCount: i,
          thumbnail: 'test',
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      '/feeds/today-popular',
    );

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(12);
    expect(body[0]).toEqual({
      id: expect.any(String),
      title: 'test19',
      likeCount: 19,
      thumbnail: 'test',
      createdAt: expect.any(String),
      viewCount: 0,
      isLike: false,
      author: {
        id: user.id,
        name: 'test',
      },
    });
  });
});
