import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { UserService } from 'src/module/user/user.service';
import { RedisService } from 'src/database/redis/redis.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /users/popular - 인기 유저 조회', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userService: UserService;
  let redis: RedisService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);

    userService = module.get<UserService>(UserService);
    redis = module.get<RedisService>(RedisService);

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
    const { accessToken, user: me } = await createTestUser(app, {
      name: 'test',
    });

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

    await prisma.block.createMany({
      data: [
        { blockerId: users[1].id, blockingId: me.id },
        { blockingId: users[1].id, blockerId: me.id },
      ],
    });

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
    expect(user.thumbnails).toHaveLength(3);
    const blockedUser = body.find((user: any) => user.id === users[1].id);
    expect(blockedUser.isBlocking).toBe(true);
    expect(blockedUser.isBlocked).toBe(true);
  });
});
