import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('GET /me/save-posts - 내가 저장한 게시글 조회', () => {
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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/me/save-posts')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 내가 저장한 게시글을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const user = await prisma.user.findFirstOrThrow();

    const posts = await prisma.post.createManyAndReturn({
      data: Array.from({ length: 15 }).map((_, index) => {
        return {
          authorId: user.id,
          type: 1,
          title: `title${index}`,
          content: `content${index}`,
        };
      }),
    });

    await prisma.postSave.createMany({
      data: posts.map((post, i) => {
        return {
          userId: user.id,
          postId: post.id,
          createdAt: new Date(Date.now() - i * 1000),
        };
      }),
    });

    // when
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .get('/me/save-posts?page=1&size=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(),
      request(app.getHttpServer())
        .get('/me/save-posts?page=2&size=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(),
    ]);

    // then
    expect(res1.status).toBe(200);
    expect(res1.body.totalCount).toBe(15);
    expect(res1.body.posts).toHaveLength(10);
    expect(res1.body.posts[0].id).toBe(posts[0].id);

    expect(res2.status).toBe(200);
    expect(res2.body.totalCount).toBe(15);
    expect(res2.body.posts).toHaveLength(5);
    expect(res2.body.posts[0].id).toBe(posts[10].id);
  });
});
