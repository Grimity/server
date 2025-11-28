import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /users/:targetId/block - 유저 차단 해제', () => {
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

  it('accessToken이 없을때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/test/block')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('uuid형식이 아닐때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/123/block')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 유저 차단을 해제한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});
    const { user: targetUser } = await createTestUser(app, {
      name: 'targetUser',
      providerId: 'test2',
      url: 'test2',
    });

    await prisma.block.create({
      data: {
        blockerId: me.id,
        blockingId: targetUser.id,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/users/${targetUser.id}/block`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);

    const blocked = await prisma.block.findFirst();

    expect(blocked).toBeNull();
  });
});
