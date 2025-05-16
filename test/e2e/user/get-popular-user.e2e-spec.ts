import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { UserService } from 'src/module/user/user.service';
import { RedisService } from 'src/database/redis/redis.service';
import { register } from '../helper';

describe('GET /users/popular - 인기 유저 조회', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let userService: UserService;
  let redis: RedisService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    redis = module.get<RedisService>(RedisService);

    jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await redis.flushall();
  });

  afterAll(async () => {
    await app.close();
  });

  it('200과 함께 인기 유저 목록을 조회한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const me = await prisma.user.findFirstOrThrow();

    const users = await prisma.user.createManyAndReturn({
      data: [
        {
          provider: 'KAKAO',
          providerId: 'test1',
          email: 'test@test.com',
          name: 'test1',
          url: 'test1',
        },
        {
          provider: 'KAKAO',
          providerId: 'test2',
          email: 'test@test.com',
          name: 'test2',
          url: 'test2',
        },
        {
          provider: 'KAKAO',
          providerId: 'test3',
          email: 'test@test.com',
          name: 'test3',
          url: 'test3',
        },
      ],
    });

    await Promise.all([
      userService.follow(users[2].id, users[0].id),
      userService.follow(users[2].id, users[1].id),
      userService.follow(users[1].id, users[0].id),
      userService.follow(me.id, users[0].id),
    ]);

    await prisma.feed.createMany({
      data: [
        {
          authorId: users[0].id,
          content: 'test',
          title: 'test',
          thumbnail: 'test1',
        },
        {
          authorId: users[0].id,
          content: 'test',
          title: 'test2',
          thumbnail: 'test2',
        },
        {
          authorId: users[0].id,
          content: 'test',
          title: 'test3',
          thumbnail: 'test3',
        },
        {
          authorId: users[0].id,
          content: 'test',
          title: 'test4',
          thumbnail: 'test4',
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/users/popular')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(4);
    const user = body.find((user: any) => user.id === users[0].id);
    expect(user.thumbnails).toHaveLength(2);
  });
});
