import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';
import { v4 as uuid } from 'uuid';

describe('GET /notifications - 알림 목록 조회', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.notification.deleteMany();
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
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: '1234',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    await prisma.notification.createMany({
      data: [
        {
          id: uuid(),
          userId: user.id,
          type: 'LIKE',
          actorId: uuid(),
          actorName: 'test',
          feedId: uuid(),
        },
        {
          id: uuid(),
          userId: user.id,
          type: 'COMMENT',
          actorId: uuid(),
          actorName: 'test',
          feedId: uuid(),
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

    // cleanup
    spy.mockRestore();
  });
});
