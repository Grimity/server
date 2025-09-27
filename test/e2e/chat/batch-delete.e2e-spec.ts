import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';
import { RedisService } from 'src/database/redis/redis.service';
import { GlobalGateway } from 'src/module/websocket/global.gateway';
import { Server } from 'socket.io';
import { Socket as ClientSocket, io } from 'socket.io-client';

describe('POST /chats/batch-delete - 채팅방 여러개 삭제', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let redisService: RedisService;
  let globalGateway: GlobalGateway;
  let socketServer: Server;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
    redisService = app.get<RedisService>(RedisService);

    jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    await app.init();
    await app.listen(3000);

    globalGateway = app.get<GlobalGateway>(GlobalGateway);
    socketServer = globalGateway.server;
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.chat.deleteMany();
    await redisService.flushall();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/chats/batch-delete')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('ids의 길이는 최소 1개 이상이어야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chats/batch-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('ids는 uuid여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chats/batch-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: ['test'],
      });

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 채팅방을 완전 삭제는 아니고 exitedAt이랑 enteredAt만 수정한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const me = await prisma.user.findFirstOrThrow();
    const users = await prisma.user.createManyAndReturn({
      data: Array.from({ length: 4 }).map((_, i) => ({
        url: `test${i + 2}`,
        name: `test${i + 2}`,
        provider: 'KAKAO',
        providerId: `test${i + 2}`,
        email: 'test@test.com',
      })),
    });

    const chats = await prisma.chat.createManyAndReturn({
      data: [{}, {}, {}, {}],
    });

    for (let i = 0; i < chats.length; i++) {
      await prisma.chatUser.createMany({
        data: [
          {
            userId: me.id,
            chatId: chats[i].id,
            enteredAt: new Date(),
            exitedAt: null,
            unreadCount: i,
          },
          {
            userId: users[i].id,
            chatId: chats[i].id,
            enteredAt: i % 2 === 0 ? new Date() : null,
            exitedAt: i % 2 === 0 ? null : new Date(),
          },
        ],
      });
    }

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chats/batch-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: chats.map(({ id }) => id),
      });

    // then
    expect(status).toBe(204);
    const afterChats = await prisma.chat.findMany();
    expect(afterChats.length).toBe(4);
    const afterChatStatus = await prisma.chatUser.findMany({
      where: {
        userId: me.id,
      },
    });

    expect(
      afterChatStatus.map(({ enteredAt, exitedAt, unreadCount }) => ({
        enteredAt,
        exitedAt,
        unreadCount,
      })),
    ).toEqual(
      Array.from({ length: 4 }).map(() => ({
        enteredAt: null,
        exitedAt: expect.any(Date),
        unreadCount: 0,
      })),
    );
  });

  it('나한테 deleteChat 이벤트가 발생한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const me = await prisma.user.findFirstOrThrow();
    const users = await prisma.user.createManyAndReturn({
      data: Array.from({ length: 4 }).map((_, i) => ({
        url: `test${i + 2}`,
        name: `test${i + 2}`,
        provider: 'KAKAO',
        providerId: `test${i + 2}`,
        email: 'test@test.com',
      })),
    });

    const chats = await prisma.chat.createManyAndReturn({
      data: [{}, {}, {}, {}],
    });

    for (let i = 0; i < chats.length; i++) {
      await prisma.chatUser.createMany({
        data: [
          {
            userId: me.id,
            chatId: chats[i].id,
            enteredAt: new Date(),
            exitedAt: null,
            unreadCount: i,
          },
          {
            userId: users[i].id,
            chatId: chats[i].id,
            enteredAt: i % 2 === 0 ? new Date() : null,
            exitedAt: i % 2 === 0 ? null : new Date(),
          },
        ],
      });
    }

    const mySocket = await new Promise<ClientSocket>((resolve) => {
      const clientSocket = io('http://localhost:3000', {
        auth: {
          accessToken,
        },
      });

      clientSocket.on('connect', () => {
        resolve(clientSocket);
      });
    });

    // when
    const eventData: any = await new Promise(async (resolve) => {
      mySocket.on('deleteChat', resolve);

      await request(app.getHttpServer())
        .post('/chats/batch-delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ids: chats.map(({ id }) => id),
        });
    });

    // then
    expect(eventData.length).toBe(4);

    // cleanup
    mySocket.disconnect();
  });
});
