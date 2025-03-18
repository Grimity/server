import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';

describe('POST /auth/register - 회원가입', () => {
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

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('google과 kakao가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'facebook',
        providerAccessToken: 'test',
        name: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('user-agent가 없으면 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        provider: 'facebook',
        providerAccessToken: 'test',
        name: 'test',
      });

    // then
    expect(status).toBe(401);
  });

  it('name이 0글자일 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'google',
        providerAccessToken: 'test',
        name: '',
      });

    // then
    expect(status).toBe(400);
  });

  it('name이 13글자 이상일 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'google',
        providerAccessToken: 'test',
        name: 'a'.repeat(13),
      });

    // then
    expect(status).toBe(400);
  });

  it('유저를 생성한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'kakaoId',
      email: 'test@test.com',
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/auth/register')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'kakao',
        providerAccessToken: 'test',
        name: 'test',
        id: 'test',
      });

    // then
    expect(status).toBe(201);
    expect(body).toEqual({
      accessToken: expect.any(String),
      id: expect.any(String),
      refreshToken: expect.any(String),
    });

    const { status: status2 } = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${body.accessToken}`);

    expect(status2).toBe(200);

    // cleanup
    spy.mockRestore();
  });

  // it('이미 있는 유저일 때 409와 함께 USER 메시지를 반환한다', async () => {
  //   // given
  //   await prisma.user.create({
  //     data: {
  //       provider: 'KAKAO',
  //       providerId: 'kakaoId',
  //       email: 'test@test.com',
  //       name: 'test',
  //     },
  //   });

  //   const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
  //     kakaoId: 'kakaoId',
  //     email: 'test@test.com',
  //   });

  //   // when
  //   const { status, body } = await request(app.getHttpServer())
  //     .post('/auth/register')
  //     .set(
  //       'User-Agent',
  //       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  //     )
  //     .send({
  //       provider: 'kakao',
  //       providerAccessToken: 'test',
  //       name: 'test2',
  //     });

  //   // then
  //   expect(status).toBe(409);
  //   expect(body.message).toBe('USER');

  //   // cleanup
  //   spy.mockRestore();
  // });

  // it('이미 있는 닉네임일때 409와 함께 NAME 메시지를 반환한다', async () => {
  //   // given
  //   await prisma.user.create({
  //     data: {
  //       provider: 'KAKAO',
  //       providerId: 'kakaoId',
  //       email: 'test@test.com',
  //       name: 'test',
  //     },
  //   });

  //   const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
  //     kakaoId: 'kakaoId2',
  //     email: 'test@test.com',
  //   });

  //   // when
  //   const { status, body } = await request(app.getHttpServer())
  //     .post('/auth/register')
  //     .set(
  //       'User-Agent',
  //       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  //     )
  //     .send({
  //       provider: 'kakao',
  //       providerAccessToken: 'test',
  //       name: 'test',
  //     });

  //   // then
  //   expect(status).toBe(409);
  //   expect(body.message).toBe('NAME');

  //   // cleanup
  //   spy.mockRestore();
  // });
});
