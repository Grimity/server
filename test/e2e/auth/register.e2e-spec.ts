import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
// import { AuthService } from 'src/provider/auth.service';

describe('POST /auth/register', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    // authService = module.get<AuthService>(AuthService);

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  it('google과 kakao가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        provider: 'facebook',
        providerAccessToken: 'test',
        name: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('name이 0글자일 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        provider: 'google',
        providerAccessToken: 'test',
        name: '',
      });

    // then
    expect(status).toBe(400);
  });

  it('name이 11글자 이상일 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        provider: 'google',
        providerAccessToken: 'test',
        name: '12345678901',
      });

    // then
    expect(status).toBe(400);
  });
});
