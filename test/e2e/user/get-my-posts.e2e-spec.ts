import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('GET /users/:id/posts - 사용자의 게시글 조회', () => {
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
      .get('/users/1/posts')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('userId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/1/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('로그인 유저와 조회할 유저가 다를 경우 403을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(403);
  });

  it('200과 함께 게시글을 조회한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const { id } = await prisma.user.findFirstOrThrow();
    await prisma.post.createMany({
      data: Array.from({ length: 15 }).map((_, index) => {
        return {
          authorId: id,
          title: `title${index}`,
          content: `content${index}`,
          type: 1,
          commentCount: 0,
          viewCount: 0,
          createdAt: new Date(Date.now() - index * 1000),
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${id}/posts?page=1&size=10`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();
    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/users/${id}/posts?page=2&size=10`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(10);
    expect(body[0].title).toBe('title0');

    expect(status2).toBe(200);
    expect(body2).toHaveLength(5);
    expect(body2[0].title).toBe('title10');
  });
});
