import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';

describe('POST /aws/image-upload-urls - presignedURL 여러장', () => {
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
      .post('/aws/image-upload-urls')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('type은 profile, feed 중 하나여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/aws/image-upload-urls')
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        {
          type: 'invalid',
          ext: 'jpg',
        },
      ]);

    // then
    expect(status).toBe(400);
  });

  it('ext는 webp여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/aws/image-upload-urls')
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        {
          type: 'feed',
          ext: 'invalid',
        },
      ]);

    // then
    expect(status).toBe(400);
  });

  it('201과 함께 url을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/aws/image-upload-urls')
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        {
          type: 'feed',
          ext: 'webp',
        },
        {
          type: 'feed',
          ext: 'webp',
        },
        {
          type: 'profile',
          ext: 'webp',
        },
      ]);

    // then
    expect(status).toBe(201);
    expect(body).toHaveLength(3);
  });
});
