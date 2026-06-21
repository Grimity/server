import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommissionWorkStatus } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';

describe('PATCH /commission-works/:id/accept - 커미션 수락', () => {
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
    status: CommissionWorkStatus = 'PENDING',
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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer()).patch(
      `/commission-works/${work.id}/accept`,
    );

    expect(status).toBe(401);
  });

  it('workId가 UUID 형식이 아니면 400을 반환한다', async () => {
    const { accessToken } = await createAuthor();

    const { status } = await request(app.getHttpServer())
      .patch('/commission-works/not-a-uuid/accept')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status).toBe(400);
  });

  it('존재하지 않는 workId면 404를 반환한다', async () => {
    const { accessToken } = await createAuthor();

    const { status, body } = await request(app.getHttpServer())
      .patch('/commission-works/00000000-0000-0000-0000-000000000000/accept')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status).toBe(404);
    expect(body.errorCode).toBe('WORK_NOT_FOUND');
  });

  it('작가 본인이 아니면 403을 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status, body } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/accept`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status).toBe(403);
    expect(body.errorCode).toBe('NOT_COMMISSION_AUTHOR');
  });

  it('PENDING 상태가 아니면 409를 반환한다', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id, 'IN_PROGRESS');

    const { status, body } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/accept`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status).toBe(409);
    expect(body.errorCode).toBe('WORK_NOT_PENDING');
  });

  it('정상 수락 시 200과 id를 반환하고 DB에 ACCEPTED 상태가 저장된다', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status, body } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/accept`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status).toBe(200);
    expect(body.id).toBe(work.id);

    const updated = await prisma.commissionWork.findUniqueOrThrow({
      where: { id: work.id },
    });
    expect(updated.status).toBe('ACCEPTED');
  });

  describe('채팅방 / 시스템 메시지', () => {
    it('수락 시 작가가 신청자에게 COMMISSION_ACCEPTED 시스템 메시지를 보낸다', async () => {
      const { user: author, accessToken } = await createAuthor();
      const { user: client } = await createClient();
      const work = await createWork(author.id, client.id);

      const { status } = await request(app.getHttpServer())
        .patch(`/commission-works/${work.id}/accept`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(status).toBe(200);

      const messages = await prisma.chatMessage.findMany({
        where: { type: 'COMMISSION_ACCEPTED', referenceId: work.id },
      });
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(
        expect.objectContaining({
          userId: author.id,
          type: 'COMMISSION_ACCEPTED',
          referenceId: work.id,
          content: '커미션을 수락했어요',
        }),
      );

      // 수신자(신청자) unread +1
      const chatUsers = await prisma.chatUser.findMany({
        where: { userId: { in: [author.id, client.id] } },
      });
      const clientChatUser = chatUsers.find((cu) => cu.userId === client.id)!;
      expect(clientChatUser.unreadCount).toBe(1);
    });
  });
});
