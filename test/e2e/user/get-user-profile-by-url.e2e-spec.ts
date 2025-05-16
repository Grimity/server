import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('GET /users/profile/:url - url로 프로필 조회', () => {
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
      `/users/profile/${user.url}`,
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

  it('피드와 앨범이 있는 경우', async () => {
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

    const albums = await prisma.album.createManyAndReturn({
      data: [
        {
          userId: user.id,
          name: 'test1',
          order: 1,
        },
        {
          userId: user.id,
          name: 'test2',
          order: 2,
        },
      ],
    });

    await prisma.feed.createMany({
      data: [
        {
          title: 'test1',
          content: 'test1',
          authorId: user.id,
          thumbnail: 'test1',
          albumId: albums[0].id,
        },
        {
          title: 'test2',
          content: 'test2',
          authorId: user.id,
          thumbnail: 'test2',
          albumId: albums[0].id,
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/users/profile/${user.url}`,
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
      feedCount: 2,
      postCount: 0,
      isFollowing: false,
      url: 'test',
      albums: [
        {
          id: albums[0].id,
          name: 'test1',
          feedCount: 2,
        },
        {
          id: albums[1].id,
          name: 'test2',
          feedCount: 0,
        },
      ],
    });
  });

  it('로그인한 유저는 isFollowing을 포함해서 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

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
      .get(`/users/profile/${targetUser.url}`)
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
      '/users/profile/not',
    );

    // then
    expect(status).toBe(404);
  });
});
