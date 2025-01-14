import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';

describe('GET /users/:id/followers', () => {
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

  it('id가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/1/followers')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 팔로워 목록을 반환한다', async () => {
    // given
    const [user, user2] = await Promise.all([
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test',
          email: 'test@test.com',
          name: 'test',
        },
      }),
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          email: 'test@test.com',
          name: 'test2',
        },
      }),
    ]);

    await prisma.follow.create({
      data: {
        followerId: user2.id,
        followingId: user.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${user.id}/followers`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual([
      {
        id: user2.id,
        name: user2.name,
        image: null,
        followerCount: 0,
      },
    ]);
  });
});
