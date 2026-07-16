import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /posts/search - 게시글 제목 검색', () => {
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

  it('200과 함께 게시글 검색 결과를 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    await prisma.post.createMany({
      data: [
        {
          authorId: user.id,
          title: 'abcde',
          type: 1,
          content: 'test content',
          createdAt: new Date(),
        },
        {
          authorId: user.id,
          title: 'abcd',
          type: 1,
          content: 'test content',
          createdAt: new Date(Date.now() - 1000),
        },
        {
          authorId: user.id,
          title: 'abde',
          type: 1,
          content: 'test content',
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/posts/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ keyword: 'bc', page: 1, size: 10, searchBy: 'combined' });

    // then
    expect(status).toBe(200);
    expect(body.totalCount).toBe(2);
    expect(body.posts).toHaveLength(2);
    expect(body.posts[0].title).toBe('abcde');
    expect(body.posts[1].title).toBe('abcd');
  });

  it('type을 지정하면 해당 타입의 게시글만 검색된다', async () => {
    // given
    const { user } = await createTestUser(app, {});

    await prisma.post.createMany({
      data: [
        {
          authorId: user.id,
          title: 'abc notice',
          type: 0,
          content: 'test content',
        },
        {
          authorId: user.id,
          title: 'abc normal',
          type: 1,
          content: 'test content',
        },
        {
          authorId: user.id,
          title: 'abc question',
          type: 2,
          content: 'test content',
        },
        {
          authorId: user.id,
          title: 'abc feedback',
          type: 3,
          content: 'test content',
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/posts/search')
      .query({ keyword: 'abc', searchBy: 'combined', type: 'QUESTION' });

    // then
    expect(status).toBe(200);
    expect(body.totalCount).toBe(1);
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].title).toBe('abc question');
    expect(body.posts[0].type).toBe('QUESTION');
  });

  it('type을 생략하면 공지를 제외한 전체에서 검색된다', async () => {
    // given
    const { user } = await createTestUser(app, {});

    await prisma.post.createMany({
      data: [
        {
          authorId: user.id,
          title: 'abc notice',
          type: 0,
          content: 'test content',
        },
        {
          authorId: user.id,
          title: 'abc normal',
          type: 1,
          content: 'test content',
        },
        {
          authorId: user.id,
          title: 'abc question',
          type: 2,
          content: 'test content',
        },
        {
          authorId: user.id,
          title: 'abc feedback',
          type: 3,
          content: 'test content',
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/posts/search')
      .query({ keyword: 'abc', searchBy: 'combined' });

    // then
    expect(status).toBe(200);
    expect(body.totalCount).toBe(3);
    expect(body.posts).toHaveLength(3);
    expect(
      body.posts.every((post: { type: string }) => post.type !== 'NOTICE'),
    ).toBe(true);
  });
});
