import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /me/followers - 내 팔로워 조회', () => {
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
      .get('/me/followers')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('팔로워 목록을 가져온다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const [user2] = await Promise.all([
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          email: 'test@test.com',
          name: 'test2',
          url: 'test2',
          followings: {
            create: {
              followingId: user.id,
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
          followings: {
            create: {
              followingId: user.id,
            },
          },
        },
      }),
    ]);

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/followers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.followers).toHaveLength(2);
    expect(body.nextCursor).toBeNull();
    const test2User = body.followers.find(
      (follower: any) => follower.id === user2.id,
    );
    expect(test2User).toEqual({
      id: user2.id,
      name: 'test2',
      image: null,
      description: '',
      url: 'test2',
    });
  });
});
