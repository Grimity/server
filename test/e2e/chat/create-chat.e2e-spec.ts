import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { sampleUuid } from '../helper/sample-uuid';
import { createTestUser } from '../helper/create-test-user';

describe('POST /chats - 채팅방 생성', () => {
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
    const { status } = await request(app.getHttpServer()).post('/chats').send();

    // then
    expect(status).toBe(401);
  });

  it('targetUserId가 UUID가 아닌 경우 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        targetUserId: '123',
      });

    // then
    expect(status).toBe(400);
  });

  it('없는 유저면 404를 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        targetUserId: sampleUuid,
      });

    // then
    expect(status).toBe(404);
  });

  it('없던 방이면 새로 만들고 201을 반환한다', async () => {
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

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        targetUserId: targetUser.id,
      });

    // then
    expect(status).toBe(201);
    expect(body).toEqual({
      id: expect.any(String),
    });
    const chatUsers = await prisma.chatUser.findMany();
    expect(chatUsers.length).toBe(2);
    const chatUserMe = chatUsers.filter(
      (user) => user.userId !== targetUser.id,
    );
    const chatUserTarget = chatUsers.filter(
      (user) => user.userId === targetUser.id,
    );

    expect(chatUserMe[0]).toEqual({
      chatId: expect.any(String),
      userId: expect.any(String),
      unreadCount: 0,
      enteredAt: expect.any(Date),
      exitedAt: null,
    });

    expect(chatUserTarget[0]).toEqual({
      chatId: expect.any(String),
      userId: targetUser.id,
      unreadCount: 0,
      enteredAt: null,
      exitedAt: null,
    });
  });

  it('원래 있던 방인데 나갔던거면 새로 만들지 않고 enteredAt만 현재시간으로 맞춰준다', async () => {
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
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        targetUserId: targetUser.id,
      });

    // then
    const chatCount = await prisma.chat.count();
    expect(chatCount).toBe(1);

    const myChatUser = await prisma.chatUser.findFirstOrThrow({
      where: {
        userId: me.id,
      },
    });

    expect(myChatUser).toEqual({
      userId: me.id,
      enteredAt: expect.any(Date),
      exitedAt: null,
      chatId: chat.id,
      unreadCount: 0,
    });
  });

  it('원래 있던 방이고 나간적 없는 경우엔 기존 방 id를 그대로 반환한다', async () => {
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
                enteredAt: new Date(),
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
      .post('/chats')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        targetUserId: targetUser.id,
      });

    // then
    expect(status).toBe(201);
    expect(body.id).toBe(chat.id);
  });
});
