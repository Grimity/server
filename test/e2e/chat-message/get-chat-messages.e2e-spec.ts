import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { sampleUuid } from '../helper/sample-uuid';
import { createTestUser } from '../helper/create-test-user';

describe('GET /chat-messages?chatId - 채팅방 별 메세지 조회', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);

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
      .get('/chat-messages?chatId=123')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('chatId가 uuid가 아닐 경우 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .get('/chat-messages?chatId=123')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('없는 chatId인 경우 404를 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .get(`/chat-messages?chatId=${sampleUuid}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('채팅방에 나간 상태면 404를 반환한다', async () => {
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
                enteredAt: null,
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
      .get(`/chat-messages?chatId=${chat.id}&size=10`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('200과 함께 메세지를 반환한다', async () => {
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
                enteredAt: new Date(),
              },
              {
                userId: user.id,
                enteredAt: new Date(),
              },
            ],
          },
        },
      },
    });

    await prisma.chatMessage.createMany({
      data: Array.from({ length: 15 }).map((_, i) => {
        return {
          chatId: chat.id,
          userId: me.id,
          content: `test${i}`,
          createdAt: new Date(Date.now() + i * 1),
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/chat-messages?chatId=${chat.id}&size=10`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/chat-messages?chatId=${chat.id}&cursor=${body.nextCursor}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.nextCursor).toBeDefined();
    expect(body.messages.length).toBe(10);
    expect(body.messages[0].content).toBe('test14');

    expect(status2).toBe(200);
    expect(body2.nextCursor).toBeNull();
    expect(body2.messages.length).toBe(5);
    expect(body2.messages[body2.messages.length - 1].content).toBe('test0');
  });

  it('exitedAt이 있으면 그 시점 이후에 생긴 메시지만 반환한다', async () => {
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
                enteredAt: new Date(),
                exitedAt: new Date(Date.now() - 1000 * 3 - 500),
              },
              {
                userId: user.id,
                enteredAt: new Date(),
              },
            ],
          },
        },
      },
    });

    await prisma.chatMessage.createMany({
      data: Array.from({ length: 15 }).map((_, i) => {
        return {
          chatId: chat.id,
          userId: me.id,
          content: `test${i}`,
          createdAt: new Date(Date.now() - i * 1000),
        };
      }),
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/chat-messages?chatId=${chat.id}&size=10`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.messages.length).toBe(4);
    expect(body.nextCursor).toBeNull();
  });

  it('답장메시지면 replyTo 필드가 포함되어 반환된다', async () => {
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
                enteredAt: new Date(),
              },
              {
                userId: user.id,
                enteredAt: new Date(),
              },
            ],
          },
        },
      },
    });

    const targetMessage = await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        userId: me.id,
        content: `test`,
      },
    });

    const replyMessage = await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        userId: me.id,
        content: `reply test`,
        replyToId: targetMessage.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/chat-messages?chatId=${chat.id}&size=1`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.nextCursor).toBeDefined();
    expect(body.messages.length).toBe(1);
    expect(body.messages[0].content).toBe('reply test');
    expect(body.messages[0].replyTo).toEqual({
      id: targetMessage.id,
      content: 'test',
      image: null,
      createdAt: targetMessage.createdAt.toISOString(),
    });
  });
});
