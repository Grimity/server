import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';

describe('GET /auth/refresh - 토큰 갱신', () => {
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
      kakaoId: 'kakaoId',
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

  it('refreshToken이 없으면 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/auth/refresh')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      );

    // then
    expect(status).toBe(401);
  });

  it('user-agent가 없으면 401을 반환한다', async () => {
    // given
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'kakao',
        providerAccessToken: 'test',
        name: 'test',
      });

    const refreshToken = response.body.refreshToken;

    // when
    const { status } = await request(app.getHttpServer())
      .get('/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 accessToken과 refreshToken을 반환한다', async () => {
    // given
    const response = await request(app.getHttpServer())
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

    const { accessToken, refreshToken } = response.body;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`)
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = body;

    expect(newAccessToken).not.toEqual(accessToken);
    expect(newRefreshToken).not.toEqual(refreshToken);
    const savedRefreshToken = await prisma.refreshToken.findMany();
    expect(savedRefreshToken).toHaveLength(1);
    expect(savedRefreshToken[0].token).toEqual(newRefreshToken);
  });
});
