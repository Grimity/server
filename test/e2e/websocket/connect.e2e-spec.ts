import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { Socket as ClientSocket, io } from 'socket.io-client';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';
import { GlobalGateway } from 'src/module/websocket/global.gateway';
import { RedisIoAdapter } from 'src/database/redis/redis.adapter';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

describe('GlobalGateway', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let clientSocket: ClientSocket | null = null;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();

    await app.init();
    await app.listen(3000);

    prisma = app.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);

    const redisIoAdapter = new RedisIoAdapter(redisService, app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // 각 테스트 후 클라이언트 소켓 닫기
    if (clientSocket) {
      clientSocket.close();
      clientSocket = null;
    }
    await redisService.flushall();
  });

  it('accessToken이 없을 때 401응답을 보낸다', async () => {
    await new Promise((resolve, reject) => {
      clientSocket = io('http://localhost:3000');

      clientSocket.on('error', (err) => {
        expect(err.statusCode).toBe(401);
        resolve(true);
      });
    });
  });

  it('accessToken이 유효하지 않을 때 401 응답을 반환한다', async () => {
    await new Promise((resolve) => {
      clientSocket = io('http://localhost:3000', {
        auth: {
          accessToken: 'invalid',
        },
      });

      clientSocket.on('error', (err) => {
        expect(err.statusCode).toBe(401);
        resolve(true);
      });
    });
  });
});
