import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { Socket as ClientSocket, io } from 'socket.io-client';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';
import { RedisIoAdapter } from 'src/database/redis/redis.adapter';
import { register } from '../helper/register';
import { AuthService } from 'src/module/auth/auth.service';

describe('GlobalGateway connect', () => {
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

  it('accessToken이 없을 때 401응답을 보낸다', async () => {
    await new Promise((resolve, reject) => {
      const clientSocket = io('http://localhost:3000');

      clientSocket.on('error', (err) => {
        expect(err.statusCode).toBe(401);
        clientSocket.close();
        resolve(true);
      });
    });
  });

  it('accessToken이 유효하지 않을 때 401 응답을 반환한다', async () => {
    await new Promise((resolve) => {
      const clientSocket = io('http://localhost:3000', {
        auth: {
          accessToken: 'invalid',
        },
      });

      clientSocket.on('error', (err) => {
        expect(err.statusCode).toBe(401);
        clientSocket.close();
        resolve(true);
      });
    });
  });

  it('connection 성공 시 redis에 socket:userId 정보를 저장한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const clientSocket = await new Promise<ClientSocket>((resolve) => {
      const clientSocket = io('http://localhost:3000', {
        auth: {
          accessToken,
        },
      });

      clientSocket.on('connect', async () => {
        resolve(clientSocket);
      });
    });

    const clientSocket2 = await new Promise<ClientSocket>((resolve) => {
      const clientSocket = io('http://localhost:3000', {
        auth: {
          accessToken,
        },
      });

      clientSocket.on('connect', async () => {
        resolve(clientSocket);
      });
    });

    // then
    const user = await prisma.user.findFirstOrThrow();
    const result1 = await redisService.pubClient.get(
      `socket:user:${clientSocket.id}`,
    );
    const result2 = await redisService.pubClient.get(
      `socket:user:${clientSocket2.id}`,
    );

    expect(result1).toBe(user.id);
    expect(result2).toBe(user.id);

    expect(clientSocket.connected).toBe(true);
    expect(clientSocket2.connected).toBe(true);

    // cleanup
    clientSocket.close();
    clientSocket2.close();
  });
});
