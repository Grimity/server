import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /posts/notices - 공지사항 조회', () => {
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

  it('200과 함께 공지사항 목록을 조회한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        email: 'test@test.com',
        name: 'test',
        url: 'test',
      },
    });

    await prisma.post.createMany({
      data: Array.from({ length: 20 }).map((_, i) => {
        return {
          authorId: user.id,
          title: `test${i}`,
          content: `test${i}`,
          type: 0,
          createdAt: new Date(Date.now() - i * 1000),
        };
      }),
    });

    await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      '/posts/notices',
    );

    // then
    expect(status).toBe(200);
    expect(body.length).toBe(20);
    expect(body[0]).toEqual({
      id: expect.any(String),
      title: 'test0',
      content: 'test0',
      thumbnail: null,
      commentCount: 0,
      viewCount: 0,
      type: 'NOTICE',
      createdAt: expect.any(String),
      author: {
        id: user.id,
        name: 'test',
        image: null,
        url: 'test',
      },
    });
  });
});
