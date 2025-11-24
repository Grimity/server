import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { createTestUser } from '../helper/create-test-user';

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

  it('로그인하지 않은 유저도 200과 함께 유저 정보를 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        email: 'testtest2@test.com',
        name: 'test',
        url: 'test',
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
      postCount: 0,
      isFollowing: false,
      url: 'test',
      albums: [],
    });
  });

  it('로그인한 유저는 isFollowing을 포함해서 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, { name: 'test' });

    const targetUser = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        email: 'test@test.com',
        name: 'test2',
        links: ['test1|~|https://test1.com'],
        url: 'test2',
      },
    });

    await request(app.getHttpServer())
      .put(`/users/${targetUser.id}/follow`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

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
      postCount: 0,
      isFollowing: true,
      url: 'test2',
      albums: [],
    });
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
