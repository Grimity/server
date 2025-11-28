import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('PUT /users/:targetId/block - 유저 차단', () => {
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
    await prisma.notification.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을때 401을 반호나한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .put('/users/test/block')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 유저를 차단한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});
    const { user: targetUser } = await createTestUser(app, {
      name: 'targetUser',
      providerId: 'test2',
      url: 'test2',
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/users/${targetUser.id}/block`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);

    const blocked = await prisma.block.findFirstOrThrow();
    expect(blocked.blockerId).toBe(me.id);
    expect(blocked.blockingId).toBe(targetUser.id);
  });
});
