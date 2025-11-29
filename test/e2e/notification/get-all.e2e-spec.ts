import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { v4 as uuid } from 'uuid';
import { createTestUser } from '../helper/create-test-user';

describe('GET /notifications - 알림 목록 조회', () => {
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
      .get('/notifications')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 알림목록을 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    await prisma.notification.createMany({
      data: [
        {
          id: uuid(),
          userId: user.id,
          image: 'test1',
          message: 'test1',
          link: 'test1',
        },
        {
          id: uuid(),
          userId: user.id,
          image: 'test2',
          message: 'test2',
          link: 'test2',
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(2);
  });
});
