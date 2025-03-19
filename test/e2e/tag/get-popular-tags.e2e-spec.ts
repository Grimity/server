import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';

describe('GET /tags/popular - 인기 태그 조회', () => {
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

  it('인기 태그를 조회한다', async () => {
    // given
    const spyCache = jest.spyOn(redis, 'cacheArray');
    const spyGet = jest.spyOn(redis, 'getArray');

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
        url: 'test',
      },
    });

    for (let i = 0; i < 15; i++) {
      await prisma.feed.create({
        data: {
          title: `test${i}`,
          thumbnail: `test${i}.jpg`,
          content: 'test',
          authorId: user.id,
          tags: {
            create: [
              {
                tagName: `test${i}`,
              },
              {
                tagName: '이건많음',
              },
            ],
          },
        },
      });
    }

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      '/tags/popular',
    );

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(16);
    expect(spyCache).toHaveBeenCalledTimes(1);
    expect(spyGet).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer()).get('/tags/popular');

    expect(spyCache).toHaveBeenCalledTimes(1);
    expect(spyGet).toHaveBeenCalledTimes(2);
  });
});
