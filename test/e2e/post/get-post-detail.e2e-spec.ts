import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('GET /posts/:id - 게시글 상세 조회', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);

    jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

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
      .get('/posts/1')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('존재하지 않는 게시글일 때 404를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/posts/00000000-0000-0000-0000-000000000000')
      .send();

    // then
    expect(status).toBe(404);
  });

  it('200과 함께 게시글 상세 조회', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        email: 'test@test.com',
        name: 'test2',
        url: 'test2',
      },
    });

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    await Promise.all([
      request(app.getHttpServer())
        .put(`/posts/${post.id}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(),
      request(app.getHttpServer())
        .put(`/posts/${post.id}/save`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(),
    ]);

    // when
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .get(`/posts/${post.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(),
      request(app.getHttpServer()).get(`/posts/${post.id}`).send(),
    ]);

    // then
    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({
      id: post.id,
      type: 'NORMAL',
      title: post.title,
      content: post.content,
      thumbnail: null,
      commentCount: 0,
      viewCount: expect.any(Number),
      likeCount: 1,
      createdAt: expect.any(String),
      isLike: true,
      isSave: true,
      author: {
        id: user.id,
        name: user.name,
        image: null,
        url: 'test2',
      },
    });
    expect(res2.status).toBe(200);
    expect(res2.body.isLike).toBe(false);
    expect(res2.body.isSave).toBe(false);

    const afterPost = await prisma.post.findFirstOrThrow();
    expect(afterPost.viewCount).toBe(2);
  });
});
