import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('POST /aws/image-upload-url', () => {
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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/aws/image-upload-url')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('type은 profile, gallery, communityPost 중 하나여야 한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: '1234',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/aws/image-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'invalid',
        ext: 'jpg',
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('ext는 jpg, jpeg, png 중 하나여야 한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: '1234',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/aws/image-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'gallery',
        ext: 'invalid',
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('성공하면 200과 함께 url을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: '1234',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/aws/image-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'gallery',
        ext: 'jpg',
      });

    // then
    expect(status).toBe(200);
    expect(body.url).toBeDefined();

    // cleanup
    spy.mockRestore();
  });
});
