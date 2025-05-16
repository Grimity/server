import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';

describe('GET /auth/logout - 로그아웃', () => {
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
      .post('/auth/logout')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      );

    // then
    expect(status).toBe(401);
  });

  it('user-agent가 없으면 401을 반환한다', async () => {
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
      .post('/auth/logout')
      .send({ refreshToken });

    // then
    expect(status).toBe(401);
  });

  it('refreshToken이 데이터베이스에 없으면 401을 반환한다', async () => {
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

    await prisma.refreshToken.deleteMany();

    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/logout')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .set('Authorization', `Bearer ${refreshToken}`)
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 refT를 삭제한다', async () => {
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

    const refreshToken = response.body.refreshToken;

    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/logout')
      .set(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      )
      .set('Authorization', `Bearer ${refreshToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const refT = await prisma.refreshToken.findFirst();
    expect(refT).toBeNull();
  });
});
