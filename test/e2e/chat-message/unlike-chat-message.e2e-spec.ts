import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { sampleUuid } from '../helper/sample-uuid';
import { RedisService } from 'src/database/redis/redis.service';
import { GlobalGateway } from 'src/module/websocket/global.gateway';
import { Server } from 'socket.io';
import { Socket as ClientSocket, io } from 'socket.io-client';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /chat-messages/:id/like - 채팅 좋아요 취소', () => {
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
      .delete('/chat-messages/ddd/like')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('uuid형식이 아닐때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/chat-messages/ddd/like')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('없는 id일때 404를 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/chat-messages/${sampleUuid}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 좋아요를 취소한다', async () => {
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
        isLike: true,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/chat-messages/${message.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
  });

  it('unlikeChatMessage 이벤트를 발생시킨다', async () => {
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
        isLike: true,
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
      mySocket.on('unlikeChatMessage', resolve);

      await request(app.getHttpServer())
        .delete(`/chat-messages/${message.id}/like`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send();
    });

    // then
    expect(eventData).toBe(message.id);

    // cleanup
    mySocket.disconnect();
  });
});
