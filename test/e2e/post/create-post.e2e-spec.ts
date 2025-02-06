import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).post('/posts').send();

    // then
    expect(status).toBe(401);
  });

  it('title이 1글자 미만일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

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
    const accessToken = await register(app, 'test');

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
    const accessToken = await register(app, 'test');

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
    const accessToken = await register(app, 'test');

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
    const accessToken = await register(app, 'test');

    // when
    const htmlText =
      '<p>test</p><img src="test.jpg" ><p>test</p><br /><p><strong>te st</strong></p>';
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
      hasImage: true,
      createdAt: expect.any(Date),
      viewCount: 0,
      commentCount: 0,
    });
  });
});
