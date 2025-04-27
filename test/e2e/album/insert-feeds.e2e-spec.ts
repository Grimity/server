import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /albums/:id - 앨범에 피드 넣기', () => {
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
      kakaoId: 'test',
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
    const { status } = await request(app.getHttpServer()).put(
      '/albums/00000000-0000-0000-0000-000000000000',
    );

    // then
    expect(status).toBe(401);
  });

  it('피드는 최소 1개 이상 있어야한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('UUID 형식이 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/INVALID')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: [],
      });

    // then
    expect(status).toBe(400);
  });
});
