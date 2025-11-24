import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /chats - 채팅 검색(커서, 이름, 사이즈)', () => {
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
    await prisma.chatUser.deleteMany();
    await prisma.chatMessage.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get('/chats').send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 이름 검색 결과를 반환한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});

    const testUserCount = 20;

    const users = await prisma.user.createManyAndReturn({
      data: Array.from({ length: testUserCount }, (_, i) => ({
        provider: 'KAKAO',
        providerId: `test${i}`,
        name: `test${i}`,
        email: `test${i}@example.com`,
        url: `test${i}`,
      })),
    });

    const chats = await prisma.chat.createManyAndReturn({
      data: Array.from({ length: testUserCount }, (_, i) => ({})),
    });

    await prisma.chatUser.createMany({
      data: users.flatMap((user, i) => [
        {
          userId: me.id,
          chatId: chats[i].id,
          enteredAt: new Date(Date.now() - 10000),
          unreadCount: 1,
        },
        {
          userId: user.id,
          chatId: chats[i].id,
          enteredAt: new Date(Date.now() - 10000),
          unreadCount: 1,
        },
      ]),
    });

    await prisma.chatMessage.createMany({
      data: Array.from({ length: testUserCount }, (_, i) => ({
        chatId: chats[i].id,
        userId: users[i].id,
        content: `message${i}`,
        createdAt: new Date(Date.now() - i * 1000),
      })),
    });

    // when
    const response1 = await request(app.getHttpServer())
      .get('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        keyword: 'test1',
        size: 10,
      });

    const response2 = await request(app.getHttpServer())
      .get('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        keyword: 'test1',
        cursor: response1.body.nextCursor,
      });

    // then
    expect(response1.status).toBe(200);
    expect(response1.body.chats.length).toBe(10);
    expect(response1.body.nextCursor).toBeDefined();
    expect(response1.body.chats[0]).toEqual({
      id: expect.any(String),
      unreadCount: 1,
      enteredAt: expect.any(String),
      opponentUser: {
        id: expect.any(String),
        name: 'test1',
        image: null,
        url: 'test1',
      },
      lastMessage: {
        id: expect.any(String),
        content: 'message1',
        createdAt: expect.any(String),
        image: null,
        senderId: users[1].id,
      },
    });

    expect(response2.status).toBe(200);
    expect(response2.body.chats.length).toBe(1);
    expect(response2.body.nextCursor).toBeNull();

    expect(response2.body.chats[0]).toEqual({
      id: expect.any(String),
      unreadCount: 1,
      enteredAt: expect.any(String),
      opponentUser: {
        id: expect.any(String),
        name: 'test19',
        image: null,
        url: 'test19',
      },
      lastMessage: null,
    });
  });
});
