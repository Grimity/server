import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { Socket as ClientSocket, io } from 'socket.io-client';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';
import { RedisIoAdapter } from 'src/database/redis/redis.adapter';
import { register } from '../helper/register';
import { AuthService } from 'src/module/auth/auth.service';

describe('GlobalGateway disconnect', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let redisService: RedisService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();

    await app.init();
    await app.listen(3000);

    prisma = app.get<PrismaService>(PrismaService);
    redisService = app.get<RedisService>(RedisService);
    authService = app.get<AuthService>(AuthService);

    jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const redisIoAdapter = new RedisIoAdapter(redisService, app);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // 각 테스트 후 클라이언트 소켓 닫기
    await redisService.flushall();
    await prisma.user.deleteMany();
  });

  it('disconnect 후엔 connectionCount가 감소한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    await new Promise((resolve) => {
      const clientSocket = io('http://localhost:3000', {
        auth: {
          accessToken,
        },
      });

      const clientSocket2 = io('http://localhost:3000', {
        auth: {
          accessToken,
        },
      });

      clientSocket.on('connected', () => {
        clientSocket.disconnect();
      });

      clientSocket2.on('connected', () => {
        clientSocket2.disconnect();
        resolve(true);
      });
    });

    // then
    const user = await prisma.user.findFirstOrThrow();
    const connectionCount = await redisService.pubClient.get(
      `connectionCount:${user.id}`,
    );
    expect(connectionCount).toBe('0');
  });
});
