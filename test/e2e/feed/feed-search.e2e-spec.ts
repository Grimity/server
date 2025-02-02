import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';

describe('GET /feeds/search - 피드 검색', () => {
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

  it('tag가 없으면 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/feeds/search')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 피드를 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
      },
    });

    for (let i = 0; i < 15; i++) {
      await prisma.feed.create({
        data: {
          title: `title${i}`,
          thumbnail: `feed/${i}.jpg`,
          cards: ['card1', 'card2'],
          content: 'content',
          authorId: user.id,
          tags: {
            createMany: {
              data: [{ tagName: `tag${i}` }, { tagName: `태그` }],
            },
          },
        },
      });
    }

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/feeds/search?tag=tag&size=10&sort=latest')
      .send();
    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(
        `/feeds/search?tag=tag&size=10&sort=latest&cursor=${body.nextCursor}`,
      )
      .send();

    // then
    expect(status).toBe(200);
    expect(body.nextCursor).not.toBeNull();
    expect(body.feeds.length).toBe(10);
    expect(status2).toBe(200);
    expect(body2.nextCursor).toBeNull();
    expect(body2.feeds.length).toBe(5);
  });
});
