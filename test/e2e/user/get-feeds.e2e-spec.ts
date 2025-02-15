import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';

describe('GET /users/:id/feeds - 유저별 피드조회', () => {
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

  // it('userId가 UUID가 아닐 때 400을 반환한다', async () => {
  //   // when
  //   const { status } = await request(app.getHttpServer())
  //     .get('/users/123/feeds')
  //     .send();

  //   // then
  //   expect(status).toBe(400);
  // });

  // it('size가 숫자가 아닐때 400을 반환한다', async () => {
  //   // when
  //   const { status } = await request(app.getHttpServer())
  //     .get('/users/00000000-0000-0000-0000-000000000000/feeds?size=abc')
  //     .send();

  //   // then
  //   expect(status).toBe(400);
  // });

  // it('sort는 latest, like, oldest 중 하나여야 한다', async () => {
  //   // when
  //   const { status } = await request(app.getHttpServer())
  //     .get('/users/00000000-0000-0000-0000-000000000000/feeds?sort=abc')
  //     .send();

  //   // then
  //   expect(status).toBe(400);
  // });

  it('200과 함께 피드를 반환한다', async () => {
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
      data: new Array(15).fill(0).map((_, index) => ({
        authorId: user.id,
        title: `title${index}`,
        content: `content${index}`,
        isAI: false,
        thumbnail: 'test',
        createdAt: new Date(2021, 1, index + 1),
      })),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${user.id}/feeds?size=12`)
      .send();

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/users/${user.id}/feeds?cursor=${body.nextCursor}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(status2).toBe(200);
    expect(body.feeds.length).toBe(12);
    expect(body2.feeds.length).toBe(3);
    expect(body2.feeds[0].title).toBe('title2');
    expect(body2.nextCursor).toBeNull();
  });
});
