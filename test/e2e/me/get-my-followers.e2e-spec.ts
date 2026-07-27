import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /me/followers - 내 팔로워 조회', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);

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
      isFollowing: false,
    });
  });

  it('맞팔로우 중인 팔로워는 isFollowing이 true다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    // user2: 나를 팔로우만 함 (단방향)
    const user2 = await prisma.user.create({
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
    });

    // user3: 나를 팔로우 + 내가 팔로우 (맞팔)
    const user3 = await prisma.user.create({
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
    });

    await prisma.follow.create({
      data: {
        followerId: user.id,
        followingId: user3.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/followers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.followers).toHaveLength(2);

    const test2User = body.followers.find(
      (follower: any) => follower.id === user2.id,
    );
    const test3User = body.followers.find(
      (follower: any) => follower.id === user3.id,
    );

    expect(test2User.isFollowing).toBe(false);
    expect(test3User.isFollowing).toBe(true);
  });
});
