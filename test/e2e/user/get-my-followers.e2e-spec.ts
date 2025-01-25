import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /users/me/followers', () => {
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
      .get('/users/me/followers')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('팔로워 목록을 가져온다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const [user2] = await Promise.all([
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          email: 'test@test.com',
          name: 'test2',
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
          followings: {
            create: {
              followingId: user.id,
            },
          },
        },
      }),
    ]);

    await prisma.follow.create({
      data: {
        followerId: user.id,
        followingId: user2.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/users/me/followers')
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
    });

    // cleanup
    spy.mockRestore();
  });
});
