import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';
import { sampleUuid } from '../helper/sample-uuid';

describe('POST /chat-messages - 채팅메시지 생성', () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('chatId가 UUID가 아니면 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: 'invalid',
        content: 'test',
        images: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('images가 있다면 chat/ prefix를 가져야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: sampleUuid,
        images: ['invalid'],
      });

    // then
    expect(status).toBe(400);
  });

  it('replyToId가 있다면 UUID 여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: sampleUuid,
        images: [],
        content: 'test',
        replyToId: 'invalid',
      });

    // then
    expect(status).toBe(400);
  });

  it('content나 images 둘 중 하나는 반드시 있어야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: sampleUuid,
        images: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('없는 chatId면 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: sampleUuid,
        content: 'test',
        images: [],
      });

    // then
    expect(status).toBe(404);
  });

  it('내가 참여한 방이 아니면 403을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const users = await prisma.user.createManyAndReturn({
      data: [
        {
          provider: 'kakao',
          providerId: 'test2',
          email: 'test@test.com',
          url: 'test2',
          name: 'test2',
        },
        {
          provider: 'kakao',
          providerId: 'test3',
          email: 'test@test.com',
          url: 'test3',
          name: 'test3',
        },
      ],
    });

    const chat = await prisma.chat.create({
      data: {
        users: {
          createMany: {
            data: [
              {
                userId: users[0].id,
              },
              {
                userId: users[1].id,
              },
            ],
          },
        },
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: chat.id,
        content: 'test',
        images: [],
      });

    // then
    expect(status).toBe(403);
  });

  it('201과 함께 content 채팅만 생성하며 상대방이 입장하지 않은 상태면 enteredAt을 생성한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const me = await prisma.user.findFirstOrThrow();

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

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: chat.id,
        content: 'test',
        images: [],
      });

    // then
    expect(status).toBe(201);
    const targetChatUser = await prisma.chatUser.findFirstOrThrow({
      where: {
        chatId: chat.id,
        userId: targetUser.id,
      },
    });

    expect(targetChatUser).toEqual({
      chatId: chat.id,
      userId: targetUser.id,
      enteredAt: expect.any(Date),
      exitedAt: null,
      unreadCount: 0,
    });

    const message = await prisma.chatMessage.findFirst();
    expect(message).toEqual({
      chatId: chat.id,
      content: 'test',
      createdAt: expect.any(Date),
      id: expect.any(String),
      image: null,
      isLike: false,
      replyToId: null,
      userId: me.id,
    });
  });

  it('content와 image를 한 번에 만든다', async () => {
    // given
    const accessToken = await register(app, 'test');
    const me = await prisma.user.findFirstOrThrow();

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

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: chat.id,
        content: 'test',
        images: ['chat/test1.png', 'chat/test2.png'],
      });

    // then
    expect(status).toBe(201);
    const chatMessages = await prisma.chatMessage.findMany();
    expect(chatMessages.length).toBe(3);
  });
});
