import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('PUT /me/push-token', () => {
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
      .put('/me/push-token')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('deviceId나 token이 없을때 400을 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    // when
    const { status: status1 } = await request(app.getHttpServer())
      .put('/me/push-token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: 'token' });

    const { status: status2 } = await request(app.getHttpServer())
      .put('/me/push-token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ deviceId: 'deviceId' });

    // then
    expect(status1).toBe(400);
    expect(status2).toBe(400);
  });

  it('204와 함께 푸시토큰을 등록한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me/push-token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ deviceId: 'deviceId', token: 'token' });

    // then
    expect(status).toBe(204);

    const me = await prisma.user.findFirstOrThrow();

    const pushToken = await prisma.pushToken.findUniqueOrThrow({
      where: {
        userId_deviceId: {
          userId: me.id,
          deviceId: 'deviceId',
        },
      },
    });
    expect(pushToken).toBeDefined();
    expect(pushToken.token).toBe('token');
  });

  it('기존에 등록된 deviceId로 푸시토큰을 다시 등록하면 토큰이 갱신된다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    await request(app.getHttpServer())
      .put('/me/push-token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ deviceId: 'deviceId', token: 'token' });

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me/push-token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ deviceId: 'deviceId', token: 'newToken' });

    // then
    expect(status).toBe(204);

    const me = await prisma.user.findFirstOrThrow();

    const pushToken = await prisma.pushToken.findUniqueOrThrow({
      where: {
        userId_deviceId: {
          userId: me.id,
          deviceId: 'deviceId',
        },
      },
    });
    expect(pushToken).toBeDefined();
    expect(pushToken.token).toBe('newToken');
  });
});
