import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';

describe('GET /feeds/rankings - 랭킹 조회', () => {
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

  it('month는 YYYY-MM 형식이어야 한다', async () => {
    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/feeds/rankings')
      .query({ month: '2025-05-01' });

    // then
    expect(status).toBe(400);
  });

  it('startDate와 endDate는 YYYY-MM-DD 형식이어야 한다', async () => {
    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/feeds/rankings')
      .query({
        startDate: '2025-05-01',
        endDate: 'INVALID_DATE',
      });

    // then
    expect(status).toBe(400);
  });

  it('주간 랭킹 목록을 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        url: 'test',
        name: 'test',
        provider: 'KAKAO',
        providerId: 'test',
        email: 'test@test.com',
      },
    });

    await prisma.feed.createMany({
      data: [
        {
          title: 'test1',
          thumbnail: 'test1',
          authorId: user.id,
          likeCount: 10,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        },
        {
          title: 'test2',
          thumbnail: 'test2',
          authorId: user.id,
          likeCount: 8,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        },
      ],
    });
    const { status, body } = await request(app.getHttpServer())
      .get('/feeds/rankings')
      .query({
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
        endDate: new Date().toISOString().split('T')[0], // 오늘 날짜
      });

    expect(status).toBe(200);
    expect(body.feeds.length).toBe(2);
    expect(body.feeds[0].likeCount).toBe(10);
  });

  it('월간 랭킹 목록을 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'kakao',
        providerId: 'test1',
        name: 'test1',
        url: 'test1',
        email: 'test1@test1.com',
      },
    });

    await prisma.feed.createMany({
      data: Array.from({ length: 20 }).map((_, i) => ({
        title: 'test' + i,
        thumbnail: 'test' + i,
        authorId: user.id,
        likeCount: i,
        createdAt: new Date(2025, 4, i + 2),
      })),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/feeds/rankings')
      .query({
        month: '2025-05',
      });

    // then
    expect(status).toBe(200);
    expect(body.feeds.length).toBe(20);
    expect(body.feeds[0].likeCount).toBe(19);
  });
});
