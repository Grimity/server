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

describe('PUT /chat-messages/:id/like - 메시지 좋아요', () => {
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
      .put('/chat-messages/ddd/like')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('없는 메세지일때 404를 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/chat-messages/${sampleUuid}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('uuid 형식이 아닐때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/chat-messages/dddddd/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 좋아요 한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});

    const targetUser = await prisma.user.create({
      data: {
        name: 'test2',
        url: 'test2',
        email: 'test@test.com',
        provider: 'kakao',
        providerId: 'test2',
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

    const message = await prisma.chatMessage.create({
      data: {
        userId: me.id,
        content: 'test',
        chatId: chat.id,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/chat-messages/${message.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
  });

  it('likeChatMessage 이벤트를 발생시킨다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});

    const targetUser = await prisma.user.create({
      data: {
        name: 'test2',
        url: 'test2',
        email: 'test@test.com',
        provider: 'kakao',
        providerId: 'test2',
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

    const message = await prisma.chatMessage.create({
      data: {
        userId: me.id,
        content: 'test',
        chatId: chat.id,
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

    socketServer.socketsJoin(`chat:${chat.id}`);

    // when
    const eventData = await new Promise(async (resolve) => {
      mySocket.on('likeChatMessage', resolve);

      await request(app.getHttpServer())
        .put(`/chat-messages/${message.id}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send();
    });

    // then
    expect(eventData).toBe(message.id);

    // cleanup
    mySocket.disconnect();
  });
});
