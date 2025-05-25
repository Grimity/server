import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /feeds/rankings - 랭킹 조회', () => {
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
        endDate: new Date(),
      });

    expect(status).toBe(200);
    expect(body.feeds.length).toBe(2);
    expect(body.feeds[0].likeCount).toBe(10);
  });
});
