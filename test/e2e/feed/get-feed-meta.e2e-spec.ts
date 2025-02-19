import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /feeds/:id/meta - 피드 메타 정보', () => {
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

  it('id가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/feeds/1/meta')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('id에 해당하는 피드가 없을 때 404를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/feeds/00000000-0000-0000-0000-000000000000/meta')
      .send();

    // then
    expect(status).toBe(404);
  });

  it('200과 함께 피드 메타 정보를 반환한다', async () => {
    // given
    const feed = await prisma.feed.create({
      data: {
        author: {
          create: {
            provider: 'KAKAO',
            providerId: 'test',
            name: 'test',
            email: 'test@test.com',
          },
        },
        title: 'title',
        content: 'content',
        thumbnail: 'thumbnail',
        tags: {
          create: [{ tagName: 'tag1' }, { tagName: 'tag2' }],
        },
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/feeds/${feed.id}/meta`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      id: feed.id,
      title: feed.title,
      content: feed.content,
      thumbnail: feed.thumbnail,
      createdAt: feed.createdAt.toISOString(),
      tags: expect.arrayContaining(['tag1', 'tag2']),
    });
  });
});
