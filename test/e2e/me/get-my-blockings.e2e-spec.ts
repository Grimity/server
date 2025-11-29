import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /me/blockings - 내가 블락한 유저 조회', () => {
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

  it('accessToken이 없으면 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/me/blockings')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 내가 블락한 유저 목록을 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const blockedUsers = await prisma.user.createManyAndReturn({
      data: [
        {
          provider: 'KAKAO',
          providerId: 'blocked1',
          email: 'test@test.com',
          name: 'blocked1',
          url: 'blocked1',
        },
        {
          provider: 'KAKAO',
          providerId: 'blocked2',
          email: 'test@test.com',
          name: 'blocked2',
          url: 'blocked2',
        },
      ],
    });

    await prisma.block.createMany({
      data: blockedUsers.map((blockedUser, i) => ({
        blockerId: user.id,
        blockingId: blockedUser.id,
        createdAt: new Date(Date.now() + i),
      })),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/blockings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.users).toHaveLength(2);
    expect(body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: blockedUsers[1].id }),
        expect.objectContaining({ id: blockedUsers[0].id }),
      ]),
    );
  });
});
