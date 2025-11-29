import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /users/search - 유저 검색', () => {
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

  it('keyword가 없을 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/users/search')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 유저 목록을 반환한다', async () => {
    // given
    await prisma.user.createMany({
      data: Array.from({ length: 19 }, (_, i) => ({
        name: `user${i}`,
        url: `user${i}`,
        provider: 'KAKAO',
        providerId: `providerId${i}`,
        email: `test${i}@test.com`,
      })),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/users/search?keyword=user&size=10')
      .send();

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/users/search?keyword=user&size=10&cursor=${body.nextCursor}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.totalCount).toBe(19);
    expect(body.users.length).toBe(10);
    expect(body.nextCursor).toBeDefined();
    expect(body.users[0].isBlocked).toBe(false);
    expect(body.users[0].isBlocking).toBe(false);

    expect(status2).toBe(200);
    expect(body2.totalCount).toBe(19);
    expect(body2.users.length).toBe(9);
    expect(body2.nextCursor).toBeNull();
  });
});
