import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';

describe('GET /feeds/hot', () => {
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
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      '/feeds/hot',
    );

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(7);
    expect(body[0]).toEqual({
      id: expect.any(String),
      title: 'test19',
      likeCount: 19,
      cards: [],
      createdAt: expect.any(String),
      viewCount: 0,
      author: {
        id: user.id,
        image: null,
        name: 'test',
      },
    });
  });
});
