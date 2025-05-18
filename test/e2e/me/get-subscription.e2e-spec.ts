import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';

describe('GET /me/subscribe - 구독 정보 조회', () => {
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
    const { status } = await request(app.getHttpServer()).get('/me/subscribe');

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 구독 정보를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    await prisma.user.updateMany({
      data: {
        subscription: {
          set: ['FOLLOW', 'FEED_LIKE', 'FEED_COMMENT'],
        },
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/subscribe')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      subscription: ['FOLLOW', 'FEED_LIKE', 'FEED_COMMENT'],
    });
  });
});
