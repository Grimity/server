import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';

describe('POST /auth/login', () => {
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

  it('provider는 google과 kakao 중 하나여야 한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/login')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'facebook',
        providerAccessToken: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('유저가 없으면 404를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/login')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'kakao',
        providerAccessToken: 'test',
      });

    // then
    expect(status).toBe(404);
  });

  it('200과 함께 accessToken을 반환한다', async () => {
    // given
    await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'kakaoId',
        email: 'test@test.com',
        name: 'test',
        url: 'test',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/auth/login')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .send({
        provider: 'kakao',
        providerAccessToken: 'test',
      });

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      accessToken: expect.any(String),
      id: expect.any(String),
      refreshToken: expect.any(String),
    });

    const { status: status2 } = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${body.accessToken}`);

    expect(status2).toBe(200);
  });
});
