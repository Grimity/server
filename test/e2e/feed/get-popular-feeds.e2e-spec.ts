import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /feeds/popular - 인기 그림 조회', () => {
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

  it('200과 함께 인기 피드 목록을 조회한다', async () => {
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
          likeCount: i,
          thumbnail: 'test',
          createdAt: new Date(Date.now() - i * 1000),
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      '/feeds/popular?size=10',
    );

    const { status: status2, body: body2 } = await request(
      app.getHttpServer(),
    ).get(`/feeds/popular?size=10&cursor=${body.nextCursor}`);

    // then
    expect(status).toBe(200);
    expect(body.feeds.length).toBe(10);
    expect(body.feeds[0].likeCount).toBe(1);
    expect(body.nextCursor).not.toBeNull();
    expect(status2).toBe(200);
    expect(body2.feeds.length).toBe(9);
    expect(body2.nextCursor).toBeNull();
  });
});
