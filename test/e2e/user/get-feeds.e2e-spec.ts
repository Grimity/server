import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';

describe('GET /users/:id/feeds', () => {
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

  it('userId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/123/feeds')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('lastId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get(
        '/users/00000000-0000-0000-0000-000000000000/feeds?lastId=123&lastCreatedAt=2021-01-01T00:00:00.000Z',
      )
      .send();

    // then
    expect(status).toBe(400);
  });

  it('lastCreatedAt이 날짜 형식이 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get(
        '/users/00000000-0000-0000-0000-000000000000/feeds?lastId=00000000-0000-0000-0000-000000000000&lastCreatedAt=123',
      )
      .send();

    // then
    expect(status).toBe(400);
  });

  it('lastId나 lastCreatedAt은 하나만 있으면 400을 반환한다', async () => {
    // when
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .get(
          '/users/00000000-0000-0000-0000-000000000000/feeds?lastId=00000000-0000-0000-0000-000000000000',
        )
        .send(),
      request(app.getHttpServer())
        .get(
          '/users/00000000-0000-0000-0000-000000000000/feeds?lastCreatedAt=2021-01-01T00:00:00.000Z',
        )
        .send(),
    ]);

    // then
    expect(res1.status).toBe(400);
    expect(res2.status).toBe(400);
  });
});
