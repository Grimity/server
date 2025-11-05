import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';

describe('POST /images/get-upload-url - presignedURL 발급', () => {
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
      kakaoId: '1234',
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
      .post('/images/get-upload-url')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('type은 profile, feed 중 하나여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'invalid',
        ext: 'jpg',
      });

    // then
    expect(status).toBe(400);
  });

  it('ext는 webp여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'feed',
        ext: 'invalid',
      });

    // then
    expect(status).toBe(400);
  });

  it('성공하면 200과 함께 url을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'feed',
        ext: 'webp',
      });

    // then
    expect(status).toBe(200);
    expect(body.uploadUrl).toBeDefined();
    expect(body.imageName).toBeDefined();
    expect(body.imageUrl).toBeDefined();
  });

  it('width와 height가 주어지면 v2 경로 + 가로x세로 형식의 파일명이 생성된다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'profile',
        ext: 'webp',
        width: 100,
        height: 200,
      });

    // then
    expect(status).toBe(200);
    expect(body.uploadUrl).toBeDefined();
    expect(body.imageName).toMatch(
      /^v2\/profile\/[a-f0-9\-]{36}_100x200\.webp$/,
    );
    expect(body.imageUrl).toBeDefined();
  });
});
