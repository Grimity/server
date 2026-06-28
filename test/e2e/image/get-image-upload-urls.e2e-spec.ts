import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('POST /images/get-upload-urls - presignedURL 여러개', () => {
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

  // it('accessToken이 없을 때 401을 반환한다', async () => {
  //   // when
  //   const { status } = await request(app.getHttpServer())
  //     .post('/images/get-upload-urls')
  //     .send();

  //   // then
  //   expect(status).toBe(401);
  // });

  it('type은 profile, feed 중 하나여야 한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/images/get-upload-urls')
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        {
          type: 'invalid',
          ext: 'jpg',
        },
      ]);

    // then
    expect(status).toBe(400);
  });

  it('ext는 webp여야 한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/images/get-upload-urls')
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        {
          type: 'feed',
          ext: 'invalid',
        },
      ]);

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 url을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/images/get-upload-urls')
      .set('Authorization', `Bearer ${accessToken}`)
      .send([
        {
          type: 'feed',
          ext: 'webp',
          width: 100,
          height: 200,
        },
        {
          type: 'feed',
          ext: 'webp',
          width: 100,
          height: 200,
        },
        {
          type: 'profile',
          ext: 'webp',
          width: 100,
          height: 200,
        },
      ]);

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(3);
  });
});
