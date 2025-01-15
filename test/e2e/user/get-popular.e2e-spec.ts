import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { v4 as uuid } from 'uuid';

describe('GET /users/popular', () => {
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

  it('200과 함께 인기 유저 목록을 반환한다', async () => {
    // given
    const users = Array.from({ length: 10 }, (_, i) => ({
      provider: 'KAKAO',
      providerId: `test${i}`,
      email: 'test@test.com',
      name: `test${i}`,
      id: uuid(),
    }));

    await prisma.user.createMany({ data: users });

    await prisma.follow.createMany({
      data: [
        {
          followerId: users[1].id,
          followingId: users[0].id,
        },
        {
          followerId: users[2].id,
          followingId: users[0].id,
        },
        {
          followerId: users[3].id,
          followingId: users[0].id,
        },
        {
          followerId: users[4].id,
          followingId: users[0].id,
        },
        {
          followerId: users[5].id,
          followingId: users[0].id,
        },
        {
          followerId: users[6].id,
          followingId: users[5].id,
        },
      ],
    });

    await prisma.feed.createMany({
      data: [
        {
          authorId: users[0].id,
          title: 'test',
        },
        {
          authorId: users[0].id,
          title: 'test',
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      '/users/popular',
    );

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(4);
    expect(body[0]).toEqual({
      id: users[0].id,
      name: users[0].name,
      image: null,
      followerCount: 5,
      feedCount: 2,
    });
    expect(body[1]).toEqual({
      id: users[5].id,
      name: users[5].name,
      image: null,
      followerCount: 1,
      feedCount: 0,
    });
  });
});
