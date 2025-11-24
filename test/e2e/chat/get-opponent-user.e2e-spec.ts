import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /chats/:id/user - 상대유저 조회', () => {
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
      kakaoId: 'test',
      email: 'test@test.com',
    });

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.chat.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/chats/123/user')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('chatId가 UUID가 아닐경우 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .get('/chats/123/user')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 상대유저를 반환한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});
    const targetUser = await prisma.user.create({
      data: {
        provider: 'kakao',
        email: 'test@test.com',
        providerId: 'test2',
        name: 'test2',
        url: 'test2',
      },
    });

    const chat = await prisma.chat.create({
      data: {
        users: {
          createMany: {
            data: [
              {
                userId: me.id,
              },
              {
                userId: targetUser.id,
              },
            ],
          },
        },
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/chats/${chat.id}/user`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.id).toBe(targetUser.id);
    expect(body.url).toBe(targetUser.url);
    expect(body.image).toBeNull();
    expect(body.name).toBe(targetUser.name);
  });
});
