import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { sampleUuid } from '../helper/sample-uuid';
import { RedisService } from 'src/database/redis/redis.service';
import { GlobalGateway } from 'src/module/websocket/global.gateway';
import { Server } from 'socket.io';
import { Socket as ClientSocket, io } from 'socket.io-client';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /chats/:id - 채팅방 삭제', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let globalGateway: GlobalGateway;
  let socketServer: Server;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);

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
      .delete('/chats/test')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('chatId가 UUID가 아닐때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/chats/test')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('없는 chatId일때 404를 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/chats/${sampleUuid}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('채팅방은 있는데 본인이 들어가있는 방이 아닐때도 404를 반환한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});

    const opponent = await prisma.user.create({
      data: {
        provider: 'kakao',
        providerId: 'test2',
        name: 'test2',
        url: 'test2',
        email: 'test@test.com',
      },
    });

    const chat = await prisma.chat.create({
      data: {},
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/chats/${chat.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('상대방이 나가지 않은 상태면 204와 함께 enteredAt과 exitedAt만 수정한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});

    const opponent = await prisma.user.create({
      data: {
        provider: 'kakao',
        providerId: 'test2',
        name: 'test2',
        url: 'test2',
        email: 'test@test.com',
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
                unreadCount: 10,
              },
              {
                userId: opponent.id,
                enteredAt: new Date(),
              },
            ],
          },
        },
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/chats/${chat.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const myStatus = await prisma.chatUser.findFirst({
      where: {
        userId: me.id,
        chatId: chat.id,
      },
    });

    expect(myStatus).toEqual({
      chatId: chat.id,
      userId: me.id,
      unreadCount: 0,
      enteredAt: null,
      exitedAt: expect.any(Date),
    });
  });

  it('상대방도 나가있는 상태면 채팅방을 삭제한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});

    const opponent = await prisma.user.create({
      data: {
        provider: 'kakao',
        providerId: 'test2',
        name: 'test2',
        url: 'test2',
        email: 'test@test.com',
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
                userId: opponent.id,
                enteredAt: null,
                exitedAt: new Date(),
              },
            ],
          },
        },
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/chats/${chat.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const afterChat = await prisma.chat.findFirst();

    expect(afterChat).toBeNull();
  });

  it('나한테 deleteChat 이벤트를 발생시킨다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});

    const opponent = await prisma.user.create({
      data: {
        provider: 'kakao',
        providerId: 'test2',
        name: 'test2',
        url: 'test2',
        email: 'test@test.com',
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
                unreadCount: 10,
              },
              {
                userId: opponent.id,
                enteredAt: new Date(),
              },
            ],
          },
        },
      },
    });

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
    const eventData = await new Promise(async (resolve) => {
      mySocket.on('deleteChat', resolve);

      await request(app.getHttpServer())
        .delete(`/chats/${chat.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send();
    });

    // then
    expect(eventData).toEqual([chat.id]);

    // cleanup
    mySocket.disconnect();
  });
});
