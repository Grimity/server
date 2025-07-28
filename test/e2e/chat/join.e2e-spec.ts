import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';
import { sampleUuid } from '../helper/sample-uuid';
import { RedisService } from 'src/database/redis/redis.service';
import { RedisIoAdapter } from 'src/database/redis/redis.adapter';
import { GlobalGateway } from 'src/module/websocket/global.gateway';
import { Server } from 'socket.io';
import { Socket as ClientSocket, io } from 'socket.io-client';

describe('PUT /:id/join', () => {
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

    const redisIoAdapter = new RedisIoAdapter(redisService, app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);

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
      .put('/chats/test/join')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('chatId가 UUID가 아닐때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/chats/test/join')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('없는 chatId일때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/chats/${sampleUuid}/join`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        socketId: 'test',
      });

    // then
    expect(status).toBe(404);
  });

  it('없는 socketId일때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const me = await prisma.user.findFirstOrThrow();
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

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/chats/${chat.id}/join`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        socketId: 'test',
      });

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 방에 들어간다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const me = await prisma.user.findFirstOrThrow();
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

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/chats/${chat.id}/join`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        socketId: clientSocket.id,
      });

    // then
    expect(status).toBe(204);
    const sockets = await socketServer.in(`chat:${chat.id}`).fetchSockets();
    expect(sockets.length).toBe(1);
    expect(sockets[0].id).toBe(clientSocket.id);

    clientSocket.disconnect();
  });
});
