import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { Socket as ClientSocket, io } from 'socket.io-client';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';
import { createTestUser } from '../helper/create-test-user';

describe('GlobalGateway disconnect', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // 각 테스트 후 클라이언트 소켓 닫기
    await redisService.flushall();
    await prisma.user.deleteMany();
  });

  it('disconnect 후엔 socket:userId를 제거한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, { name: 'test' });

    // when
    const mySocket = await new Promise<ClientSocket>(async (resolve) => {
      const clientSocket = io('http://localhost:3000', {
        auth: {
          accessToken,
        },
      });

      clientSocket.on('connected', () => {
        clientSocket.disconnect();
        resolve(clientSocket);
      });
    });

    // then
    const value = await redisService.pubClient.get(
      `socket:user:${mySocket.id}`,
    );

    expect(value).toBeNull();
  });
});
