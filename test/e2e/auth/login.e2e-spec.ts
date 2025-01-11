import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';

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

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  it('provider는 google과 kakao 중 하나여야 한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        provider: 'facebook',
        providerAccessToken: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('유저가 없으면 404를 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'kakaoId',
      email: 'test@test.com',
    });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        provider: 'kakao',
        providerAccessToken: 'test',
      });

    // then
    expect(status).toBe(404);

    // cleanup
    spy.mockRestore();
  });

  it('200과 함께 accessToken을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'kakaoId',
      email: 'test@test.com',
    });

    await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'kakaoId',
        email: 'test@test.com',
        name: 'test',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        provider: 'kakao',
        providerAccessToken: 'test',
      });

    // then
    expect(status).toBe(200);
    expect(body.accessToken).toBeDefined();

    const { status: status2 } = await request(app.getHttpServer())
      .get('/auth/test')
      .set('Authorization', `Bearer ${body.accessToken}`);

    expect(status2).toBe(200);

    // cleanup
    spy.mockRestore();
  });
});
