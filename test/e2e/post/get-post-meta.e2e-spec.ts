import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /posts/:id/meta - 게시글 메타 조회', () => {
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

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/posts/1/meta')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('존재하지 않는 게시글일 때 404를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/posts/00000000-0000-0000-0000-000000000000/meta')
      .send();

    // then
    expect(status).toBe(404);
  });

  it('200과 함께 게시글 메타 조회', async () => {
    // given
    const { id } = await prisma.post.create({
      data: {
        author: {
          create: {
            provider: 'kakao',
            providerId: 'test',
            name: 'test',
            email: 'test@test.com',
          },
        },
        title: 'title',
        content: 'content',
        thumbnail: null,
        type: 1,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/posts/${id}/meta`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      id,
      title: 'title',
      content: 'content',
      thumbnail: null,
      createdAt: expect.any(String),
    });
  });
});
