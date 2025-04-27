import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('POST /albums - 앨범 생성', () => {
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
    const { status } = await request(app.getHttpServer())
      .post('/albums')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('앨범 이름은 1자 이상 15자 이하어야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'a'.repeat(16) });

    // then
    expect(status).toBe(400);
  });

  it('201과 함께 앨범을 생성한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'test' });

    // then
    expect(status).toBe(201);
    expect(body).toEqual({
      id: expect.any(String),
    });
  });

  it('앨범 이름이 중복일 때 409를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    await request(app.getHttpServer())
      .post('/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'test' });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'test' });

    // then
    expect(status).toBe(409);
  });

  it('앨범 개수가 8개 이상일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const albums = Array.from({ length: 8 }, (_, i) => ({
      userId: user.id,
      name: `test${i}`,
      order: i + 1,
    }));
    await prisma.album.createMany({ data: albums });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'test' });

    // then
    expect(status).toBe(400);
  });
});
