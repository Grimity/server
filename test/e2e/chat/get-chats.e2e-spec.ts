import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { register } from '../helper/register';
import { AuthService } from 'src/module/auth/auth.service';
import { v4 as uuidv4 } from 'uuid';

describe('GET /chats - 채팅 검색(이름만)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);

    jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.chatUser.deleteMany();
    await prisma.chatMessage.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get('/chats').send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 이름 검색 결과를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const me = await prisma.user.findFirstOrThrow();

    const testUserCount = 50;

    for (let i = 0; i < testUserCount; i++) {
      const testUser = await prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: `test${i}`,
          name: `test${i}`,
          email: `test${i}@example.com`,
          url: `test${i}`,
          image: `https://test${i}.com/image.png`,
        },
      });

      const chat = await prisma.chat.create({
        data: { id: uuidv4(), createdAt: new Date() },
      });

      await prisma.chatUser.createMany({
        data: [
          {
            userId: me.id,
            chatId: chat.id,
            enteredAt: new Date(),
            unreadCount: 1,
          },
          {
            userId: testUser.id,
            chatId: chat.id,
            enteredAt: new Date(),
            unreadCount: 1,
          },
        ],
      });

      await prisma.chatMessage.createMany({
        data: [
          {
            chatId: chat.id,
            userId: testUser.id,
            content: `This is test message ${i} from testUser`,
            createdAt: new Date(),
          },
          {
            chatId: chat.id,
            userId: me.id,
            content: `This is test message ${i} from me`,
            createdAt: new Date(),
          },
        ],
      });
    }

    let cursor: string | null = null;
    while (true) {
      // when
      const size = 5;
      const { body, status } = await request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          username: 'test1',
          size,
          cursor,
        });

      cursor = body.nextCursor;

      // then
      expect(status).toBe(200);
      // test1, test10 ~ test19 총 11개
      expect(body.chats.length).toBeLessThanOrEqual(size);
      expect(body.nextCursor).toBeDefined();

      for (const [i, chat] of body.chats.entries()) {
        expect(chat.id).toBeDefined();
        expect(chat.opponent.id).toBeDefined();
        expect(chat.opponent.name).toBeDefined();
        expect(chat.opponent.image).toBeDefined();
        expect(chat.opponent.url).toBeDefined();
        expect(chat.lastMessage).toBeDefined();

        // 마지막으로 온 채팅 메시지 순서대로 정렬되어 있는지 확인
        if (i < body.chats.length - 1) {
          expect(
            new Date(chat.lastMessage.createdAt).getTime(),
          ).toBeGreaterThan(
            new Date(body.chats[i + 1].lastMessage.createdAt).getTime(),
          );
        }
      }
      if (!cursor) {
        break;
      }
    }
  });
});
