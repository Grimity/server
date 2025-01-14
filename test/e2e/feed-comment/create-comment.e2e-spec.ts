import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('POST /feed-comments', () => {
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
      .post('/feed-comments')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        feedId: '1',
        comment: 'test',
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('comment가 없을 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        comment: '',
        feedId: '00000000-0000-0000-0000-000000000000',
        parentCommentId: null,
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('parentCommentId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feed-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        comment: 'test',
        feedId: '00000000-0000-0000-0000-000000000000',
        parentCommentId: '1',
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });
});
