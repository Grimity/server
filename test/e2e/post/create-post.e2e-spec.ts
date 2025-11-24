import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { createTestUser } from '../helper/create-test-user';

describe('POST /posts - 게시글 생성', () => {
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
    const { status } = await request(app.getHttpServer()).post('/posts').send();

    // then
    expect(status).toBe(401);
  });

  it('title이 1글자 미만일 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '    ',
        content: 'test',
        type: 'NORMAL',
      });

    // then
    expect(status).toBe(400);
  });

  it('title이 32글자 초과일 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'a'.repeat(33),
        content: 'test',
        type: 'NORMAL',
      });

    // then
    expect(status).toBe(400);
  });

  it('content가 없을 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'test',
        content: '',
        type: 'NORMAL',
      });

    // then
    expect(status).toBe(400);
  });

  it('type은 normal, notice, question, feedback 중 하나여야 한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'test',
        content: 'test',
        type: 'INVALID',
      });

    // then
    expect(status).toBe(400);
  });

  it('201과 함께 id를 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const htmlText =
      '<h1><strong>아아아아아ㅏ</strong></h1><p><strong><span style="color: #e03e2d;">맛도리</span></strong></p><p><strong><img src="https://image.grimity.com/post/9a21b826-a173-4057-801e-f67630a74018.jpeg" alt=""></strong></p><p><strong><span style="color: #e03e2d;"><strong><img src="https://image.grimity.com/post/9109549f-f4fc-4541-8fa4-d322fd746789.jpeg" alt=""></strong></span></strong></p><p>&nbsp;</p><p><strong><span style="color: #e03e2d;"><strong><img src="https://image.grimity.com/post/e612fb8d-660f-4081-bd97-c527d2e660bf.jpeg" alt=""></strong></span></strong></p>';
    const { status, body } = await request(app.getHttpServer())
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'test',
        content: htmlText,
        type: 'NORMAL',
      });

    // then
    expect(status).toBe(201);
    const post = await prisma.post.findFirstOrThrow();
    expect(post).toEqual({
      id: body.id,
      authorId: expect.any(String),
      title: 'test',
      content: htmlText,
      type: 1,
      thumbnail:
        'https://image.grimity.com/post/9a21b826-a173-4057-801e-f67630a74018.jpeg',
      createdAt: expect.any(Date),
      viewCount: 0,
      commentCount: 0,
    });
  });
});
