import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { register } from '../helper/register';
import { AuthService } from 'src/module/auth/auth.service';
import { sampleUuid } from '../helper/sample-uuid';

describe('GET /chats/search - 채팅 검색(이름만)', () => {
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
    const { status } = await request(app.getHttpServer())
      .get('/chats/search')
      .send();
    // then
    expect(status).toBe(401);
  });

  it('200과 함께 이름 검색 결과를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const me = await prisma.user.findFirstOrThrow();

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        name: 'test2',
        email: 'test2@example.com',
        url: 'test2',
      },
    });

    await prisma.chat.create({
      data: { id: sampleUuid },
    });

    await prisma.chatUser.createMany({
      data: [
        { userId: me.id, chatId: sampleUuid, enteredAt: new Date() },
        { userId: user.id, chatId: sampleUuid, enteredAt: new Date() },
      ],
    });

    await prisma.chatMessage.createMany({
      data: [
        {
          chatId: sampleUuid,
          userId: me.id,
          content: 'Hello',
          createdAt: new Date(),
        },
        {
          chatId: sampleUuid,
          userId: user.id,
          content: 'Hello back',
          createdAt: new Date(),
        },
      ],
    });

    // when
    const { body, status } = await request(app.getHttpServer())
      .get('/chats/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        username: 'test2',
        size: 10,
      });
    // then
    expect(status).toBe(200);
    expect(body.chats.length).toBe(1);
    expect(body.chats[0].id).toBe(sampleUuid);
    expect(body.chats[0].lastMessage.content).toBe('Hello back');
    expect(body.chats[0].opponent.name).toBe('test2');
    expect(body.chats[0].opponent.id).toBe(user.id);
  });
});
