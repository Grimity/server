import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /me/albums - 내 앨범 목록 조회', () => {
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
      .get('/me/albums')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 내 앨범 목록을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    await prisma.album.createMany({
      data: [
        { userId: user.id, name: 'test1', order: 1 },
        { userId: user.id, name: 'test2', order: 2 },
        { userId: user.id, name: 'test3', order: 3 },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual([
      {
        id: expect.any(String),
        name: 'test1',
      },
      {
        id: expect.any(String),
        name: 'test2',
      },
      {
        id: expect.any(String),
        name: 'test3',
      },
    ]);
  });
});
