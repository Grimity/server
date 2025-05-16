import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('GET /me/followings - 내 팔로잉 조회', () => {
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
      .get('/me/followings')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 팔로잉 목록을 조회한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    await Promise.all([
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          email: 'test@test.com',
          name: 'test2',
          url: 'test2',
          followers: {
            create: {
              followerId: user.id,
            },
          },
        },
      }),
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test3',
          email: 'test@test.com',
          name: 'test3',
          url: 'test3',
          followers: {
            create: {
              followerId: user.id,
            },
          },
        },
      }),
    ]);

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/followings?size=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.nextCursor).toBeDefined();
    expect(body.followings).toHaveLength(1);
  });
});
