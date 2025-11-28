import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /me/followers/:id', () => {
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
      .delete('/me/followers/follow')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 내 팔로워를 삭제한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const targetUser = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        email: 'test@test.com',
        name: 'test2',
        url: 'test2',
      },
    });

    await prisma.follow.create({
      data: {
        followerId: targetUser.id,
        followingId: user.id,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/me/followers/${targetUser.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const follow = await prisma.follow.findFirst();
    expect(follow).toBeNull();
  });
});
