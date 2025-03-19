import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /users/me - 내 정보 조회', () => {
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
      .get('/users/me')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 내 정보를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    await prisma.user.updateMany({
      data: {
        description: 'test',
        image: 'profile/test.png',
        links: ['test1|~|https://test1.com'],
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      id: user.id,
      url: 'test',
      provider: 'KAKAO',
      email: 'test@test.com',
      name: 'test',
      image: 'profile/test.png',
      backgroundImage: null,
      description: 'test',
      links: [{ linkName: 'test1', link: 'https://test1.com' }],
      createdAt: expect.any(String),
      hasNotification: false,
    });
  });
});
