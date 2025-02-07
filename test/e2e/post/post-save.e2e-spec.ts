import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /posts/:id/save - 게시글 저장', () => {
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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .put('/posts/1/save')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/posts/1/save')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('없는 id일 때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/posts/00000000-0000-0000-0000-000000000000/save')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 save를 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'title',
        content: 'content',
        type: 1,
        hasImage: false,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/posts/${post.id}/save`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const save = await prisma.postSave.findFirstOrThrow();
    expect(save.userId).toBe(user.id);
    expect(save.postId).toBe(post.id);
  });

  it('이미 save한 경우 409를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'title',
        content: 'content',
        type: 1,
        hasImage: false,
      },
    });

    await request(app.getHttpServer())
      .put(`/posts/${post.id}/save`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/posts/${post.id}/save`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(409);
  });
});
