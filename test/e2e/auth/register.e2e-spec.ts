import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';

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

  // it('user-agent가 없으면 401을 반환한다', async () => {
  //   // when
  //   const { status } = await request(app.getHttpServer())
  //     .post('/auth/register')
  //     .send({
  //       provider: 'facebook',
  //       providerAccessToken: 'test',
  //       name: 'test',
  //     });

  //   // then
  //   expect(status).toBe(401);
  // });

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

  it('url에 허용되지 않은 문자가 있으면 400을 반환한다', async () => {
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
        name: 'test',
        url: 'abc*D',
      });

    // then
    expect(status).toBe(400);
  });

  it('id가 popular 이면 400을 반환한다', async () => {
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
        name: 'test',
        url: 'popular',
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
        url: 'test',
      });

    // then
    expect(status).toBe(201);
    expect(body).toEqual({
      accessToken: expect.any(String),
      id: expect.any(String),
      refreshToken: expect.any(String),
    });

    const { status: status2 } = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${body.accessToken}`);

    expect(status2).toBe(200);

    // cleanup
    spy.mockRestore();
  });

  it('앱 회원가입', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'kakaoId',
      email: 'test@test.com',
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/auth/register')
      .set('grimity-app-device', 'mobile')
      .set('grimity-app-model', 'Samsung Galaxy S22+')
      .send({
        provider: 'kakao',
        providerAccessToken: 'test',
        name: 'test',
        url: 'test',
        deviceId: 'device-1234',
      });

    // then
    expect(status).toBe(201);
    expect(body).toEqual({
      accessToken: expect.any(String),
      id: expect.any(String),
      refreshToken: expect.any(String),
    });

    const { status: status2 } = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${body.accessToken}`);

    expect(status2).toBe(200);

    const refreshToken = await prisma.refreshToken.findFirst({
      where: { userId: body.id },
    });
    expect(refreshToken?.deviceId).toBe('device-1234');

    // cleanup
    spy.mockRestore();
  });

  it('id가 중복이면 409를 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'kakaoId',
      email: 'test@test.com',
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'kakao',
        providerAccessToken: 'test',
        name: 'test',
        url: 'test',
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
        name: 'test2',
        url: 'test',
      });

    // then
    expect(status).toBe(409);
  });
});
