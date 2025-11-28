import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';
import { GlobalGateway } from 'src/module/websocket/global.gateway';
import { Server } from 'socket.io';
import { Socket as ClientSocket, io } from 'socket.io-client';
import { createTestUser } from '../helper/create-test-user';

describe('PUT /chats/:id/leave - 채팅방 나가기', () => {
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
      .put('/chats/test/leave')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('chatId가 UUID가 아닐때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put('/chats/test/leave')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 방에서 나간다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, {});
    const user = await prisma.user.create({
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
              },
              {
                userId: user.id,
              },
            ],
          },
        },
      },
    });

    const clientSocket = await new Promise<ClientSocket>((resolve) => {
      const clientSocket = io('http://localhost:3000', {
        auth: {
          accessToken,
        },
      });

      clientSocket.on('connect', () => {
        resolve(clientSocket);
      });
    });

    await request(app.getHttpServer())
      .put(`/chats/${chat.id}/join`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        socketId: clientSocket.id,
      });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/chats/${chat.id}/leave`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        socketId: clientSocket.id,
      });

    // then
    expect(status).toBe(204);
    const sockets = await socketServer.in(`chat:${chat.id}`).fetchSockets();
    expect(sockets.length).toBe(0);

    // cleanup
    clientSocket.disconnect();
  });
});
