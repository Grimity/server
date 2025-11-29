import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /me/save-feeds - 내가 저장한 피드 조회', () => {
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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/me/save-feeds')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 내가 저장 한 피드를 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const feeds = await prisma.feed.createManyAndReturn({
      data: Array.from({ length: 30 }).map((_, index) => {
        return {
          authorId: user.id,
          content: `test${index}`,
          title: `title${index}`,
          thumbnail: `thumbnail${index}.png`,
          createdAt: new Date(new Date().getTime() - index * 1000),
        };
      }),
    });

    for await (const [index, feed] of feeds.entries()) {
      await prisma.save.create({
        data: {
          userId: user.id,
          feedId: feed.id,
          createdAt: new Date(new Date().getTime() - index * 1000),
        },
      });
    }

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/save-feeds?size=20')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/me/save-feeds?size=20&cursor=${body.nextCursor}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.feeds.length).toBe(20);
    expect(body.nextCursor).toBeDefined();
    expect(status2).toBe(200);
    expect(body2.feeds.length).toBe(10);
    expect(body2.nextCursor).toBeNull();
    expect(body2.feeds[9].id).toBe(feeds[29].id);
  });
});
