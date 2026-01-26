import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

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

  afterAll(async () => {
    await app.close();
  });

  it('200과 함께 검색 결과를 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const feeds = await prisma.feed.createManyAndReturn({
      data: [
        {
          authorId: user.id,
          title: 'asdfg',
          content: 'content1',
          thumbnail: 'test1',
          cards: [],
        },
        {
          authorId: user.id,
          title: 'qwert',
          content: 'content1',
          thumbnail: 'test1',
          cards: [],
        },
        {
          authorId: user.id,
          title: '검색되면안되는거',
          content: 'content1',
          thumbnail: 'test1',
          cards: [],
        },
      ],
    });

    await prisma.tag.createMany({
      data: [
        {
          feedId: feeds[1].id,
          tagName: 'sdf',
        },
        {
          feedId: feeds[2].id,
          tagName: 'sdfg',
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/feeds/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ keyword: 'sdf' });
    console.dir(body, { depth: null });

    // then
    expect(status).toBe(200);
    expect(body.feeds.length).toBe(2);
    expect(body.nextCursor).toBeNull();
  });
});
