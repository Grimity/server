import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';
import { v4 as uuid } from 'uuid';

describe('DELETE /notifications/:id - 개별 알림 삭제', () => {
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

    jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: '1234',
      email: 'test@test.com',
    });

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.notification.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).delete(
      `/notifications/${uuid()}`,
    );

    // then
    expect(status).toBe(401);
  });

  it('uuid가 아닐때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/notifications/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 알림을 삭제한다', async () => {
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

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
      .delete(`/notifications/${notification.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const notificationCount = await prisma.notification.count();
    expect(notificationCount).toBe(0);
  });
});
