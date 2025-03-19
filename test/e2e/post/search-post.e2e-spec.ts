import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /posts/search - 게시글 검색(이름만)', () => {
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

  it('keyword가 2글자 미만일 경우 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/posts/search')
      .query({
        keyword: 'a    ',
        searchBy: 'title-content',
      });

    // then
    expect(status).toBe(400);
  });

  it('searchBy는 title-content, name 중 하나여야 한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/posts/search')
      .query({
        keyword: 'ab',
        searchBy: 'invalid',
      });

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 이름 검색 결과를 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
        url: 'test',
      },
    });

    await prisma.post.createMany({
      data: Array.from({ length: 15 }).map((_, index) => ({
        title: `title${index}`,
        content: `content${index}`,
        authorId: user.id,
        createdAt: new Date(Date.now() - index * 1000),
        type: 1,
      })),
    });

    // when
    const [response1, response2, response3] = await Promise.all([
      request(app.getHttpServer()).get('/posts/search').query({
        keyword: 'test',
        searchBy: 'name',
        size: 10,
        page: 1,
      }),
      request(app.getHttpServer()).get('/posts/search').query({
        keyword: 'test',
        searchBy: 'name',
        size: 10,
        page: 2,
      }),
      request(app.getHttpServer()).get('/posts/search').query({
        keyword: 'tes',
        searchBy: 'name',
      }),
    ]);

    // then
    expect(response1.status).toBe(200);
    expect(response1.body.totalCount).toBe(15);
    expect(response1.body.posts).toHaveLength(10);
    expect(response1.body.posts[0]).toEqual({
      id: expect.any(String),
      type: 'NORMAL',
      title: 'title0',
      content: 'content0',
      thumbnail: null,
      commentCount: 0,
      viewCount: 0,
      createdAt: expect.any(String),
      author: {
        id: user.id,
        name: 'test',
      },
    });

    expect(response2.status).toBe(200);
    expect(response2.body.totalCount).toBe(15);
    expect(response2.body.posts).toHaveLength(5);

    expect(response3.status).toBe(200);
    expect(response3.body.totalCount).toBe(0);
    expect(response3.body.posts).toHaveLength(0);
  });
});
