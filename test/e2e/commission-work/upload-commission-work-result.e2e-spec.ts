import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommissionWorkStatus } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';

describe('PUT /commission-works/:id/result - 작업물 업로드 시스템 메시지', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SpamDetectionListener)
      .useValue({})
      .compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createAuthor() {
    return await createTestUser(app, {
      url: 'author',
      name: 'author',
      providerId: 'author',
      email: 'author@example.com',
    });
  }

  async function createClient() {
    return await createTestUser(app, {
      url: 'client',
      name: 'client',
      providerId: 'client',
      email: 'client@example.com',
    });
  }

  async function createWork(
    authorId: string,
    clientId: string,
    status: CommissionWorkStatus = 'ACCEPTED',
  ) {
    return await prisma.commissionWork.create({
      data: {
        authorId,
        clientId,
        commissionId: null,
        status,
        request: {
          create: {
            answers: [],
            referenceImages: [],
          },
        },
      },
    });
  }

  it('중간 작업물 업로드 시 작가가 신청자에게 COMMISSION_RESULT_UPLOADED 시스템 메시지를 보낸다', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer())
      .put(`/commission-works/${work.id}/result`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ images: ['v2/commission-work/a.png'], isFinal: false });
    expect(status).toBe(200);

    const messages = await prisma.chatMessage.findMany({
      where: { type: 'COMMISSION_RESULT_UPLOADED', referenceId: work.id },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(
      expect.objectContaining({
        userId: author.id,
        type: 'COMMISSION_RESULT_UPLOADED',
        referenceId: work.id,
        content: '작업물을 업로드했어요',
      }),
    );

    // 수신자(신청자) unread +1
    const chatUsers = await prisma.chatUser.findMany({
      where: { userId: { in: [author.id, client.id] } },
    });
    const clientChatUser = chatUsers.find((cu) => cu.userId === client.id)!;
    expect(clientChatUser.unreadCount).toBe(1);
  });

  it('최종 작업물 업로드 시 작가가 신청자에게 COMMISSION_FINAL_UPLOADED 시스템 메시지를 보낸다', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer())
      .put(`/commission-works/${work.id}/result`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ images: ['v2/commission-work/final.png'], isFinal: true });
    expect(status).toBe(200);

    const messages = await prisma.chatMessage.findMany({
      where: { type: 'COMMISSION_FINAL_UPLOADED', referenceId: work.id },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(
      expect.objectContaining({
        userId: author.id,
        type: 'COMMISSION_FINAL_UPLOADED',
        referenceId: work.id,
        content: '최종 작업물을 업로드했어요',
      }),
    );

    const chatUsers = await prisma.chatUser.findMany({
      where: { userId: { in: [author.id, client.id] } },
    });
    const clientChatUser = chatUsers.find((cu) => cu.userId === client.id)!;
    expect(clientChatUser.unreadCount).toBe(1);
  });
});
