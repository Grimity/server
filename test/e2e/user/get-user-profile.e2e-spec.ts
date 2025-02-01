import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /users/:id - 유저 프로필 조회', () => {
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

  it('로그인하지 않은 유저도 200과 함께 유저 정보를 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        email: 'testtest2@test.com',
        name: 'test',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/users/${user.id}`,
    );

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      id: user.id,
      name: 'test',
      image: null,
      backgroundImage: null,
      description: '',
      links: [],
      followerCount: 0,
      followingCount: 0,
      feedCount: 0,
      isFollowing: false,
    });
  });

  it('로그인한 유저는 isFollowing을 포함해서 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    const targetUser = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        email: 'test@test.com',
        name: 'test2',
        links: ['test1|~|https://test1.com'],
      },
    });

    await prisma.follow.create({
      data: {
        followerId: user.id,
        followingId: targetUser.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      id: targetUser.id,
      name: 'test2',
      image: null,
      backgroundImage: null,
      description: '',
      links: [{ linkName: 'test1', link: 'https://test1.com' }],
      followerCount: 1,
      followingCount: 0,
      feedCount: 0,
      isFollowing: true,
    });

    // cleanup
    spy.mockRestore();
  });

  it('없는 유저면 404를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get(
      '/users/0bc1f834-add1-4627-a695-85898cedad4d',
    );

    // then
    expect(status).toBe(404);
  });
});
