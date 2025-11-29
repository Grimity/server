import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import { createTestUser } from '../helper/create-test-user';

describe('PUT /notifications/:id - 개별 알림 읽음 처리', () => {
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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .put('/notifications/1')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('uuid가 아닐때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put('/notifications/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 알림을 읽음 처리 한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const notification = await prisma.notification.create({
      data: {
        id: uuid(),
        userId: user.id,
        image: 'test1',
        message: 'test1',
        link: 'test1',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/notifications/${notification.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const updatedNotification = await prisma.notification.findUniqueOrThrow({
      where: {
        id: notification.id,
      },
    });
    expect(updatedNotification.isRead).toBe(true);
  });
});
