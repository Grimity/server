import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';

describe('POST /commission-works - 커미션 신청', () => {
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
    const { user } = await createTestUser(app, {
      url: 'author',
      name: 'author',
      providerId: 'author',
      email: 'author@example.com',
    });
    return user;
  }

  async function createClient() {
    return await createTestUser(app, {
      url: 'client',
      name: 'client',
      providerId: 'client',
      email: 'client@example.com',
    });
  }

  async function createCommission(authorId: string) {
    return await prisma.commission.create({
      data: {
        authorId,
        title: 'SD 커미션',
        description: '<p>설명</p>',
        additionalCondition: null,
        price: 10000,
        workDays: 7,
        revisionCount: 1,
        images: ['v2/commission/a.png'],
        thumbnail: 'v2/commission/a.png',
        questions: {
          createMany: {
            data: [
              {
                order: 0,
                type: 'SINGLE_SELECT',
                title: '사용용도',
                description: null,
                isRequired: true,
                options: ['개인소장용', '방송/홍보', '상업용'],
              },
              {
                order: 1,
                type: 'MULTI_SELECT',
                title: '원하는 옵션',
                description: null,
                isRequired: false,
                options: ['배경', '소품', '효과'],
              },
              {
                order: 2,
                type: 'TEXT',
                title: '캐릭터 정보',
                description: null,
                isRequired: true,
                options: [],
              },
            ],
          },
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  const formPayload = (authorId: string, commissionId: string) => ({
    authorId,
    commissionId,
    referenceImages: ['v2/commission-work/ref1.png'],
    answers: [
      { selectedOptions: ['개인소장용'] },
      { selectedOptions: ['배경', '소품'] },
      { text: '검정 단발머리, 붉은 눈' },
    ],
  });

  const directPayload = (authorId: string) => ({
    authorId,
    referenceImages: ['v2/commission-work/ref1.png'],
    answers: [
      {
        type: 'TEXT',
        title: '요청 설명',
        isRequired: true,
        text: 'OC 힐링 분위기 배경 포함 일러스트 요청합니다.',
      },
      {
        type: 'TEXT',
        title: '가격 선 제시',
        text: '30000',
      },
    ],
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    const author = await createAuthor();

    const { status } = await request(app.getHttpServer())
      .post('/commission-works')
      .send(directPayload(author.id));

    expect(status).toBe(401);
  });

  it('authorId가 자기 자신이면 400을 반환한다', async () => {
    const { user, accessToken } = await createClient();

    const { status } = await request(app.getHttpServer())
      .post('/commission-works')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(directPayload(user.id));

    expect(status).toBe(400);
  });

  it('authorId 유저가 존재하지 않으면 404를 반환한다', async () => {
    const { accessToken } = await createClient();

    const { status } = await request(app.getHttpServer())
      .post('/commission-works')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(directPayload('00000000-0000-0000-0000-000000000000'));

    expect(status).toBe(404);
  });

  it('referenceImages가 11개 이상이면 400을 반환한다', async () => {
    const author = await createAuthor();
    const { accessToken } = await createClient();

    const { status } = await request(app.getHttpServer())
      .post('/commission-works')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...directPayload(author.id),
        referenceImages: Array.from({ length: 11 }, (_, i) => `r${i}.png`),
      });

    expect(status).toBe(400);
  });

  describe('FORM 모드 (commissionId 있음)', () => {
    it('존재하지 않는 commissionId면 404를 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...formPayload(author.id, '00000000-0000-0000-0000-000000000000'),
        });

      expect(status).toBe(404);
    });

    it('commission의 authorId와 요청 body의 authorId가 다르면 400을 반환한다', async () => {
      const author = await createAuthor();
      const otherAuthor = await prisma.user.create({
        data: {
          url: 'other',
          name: 'other',
          provider: 'KAKAO',
          providerId: 'other',
          email: 'other@example.com',
        },
      });
      const commission = await createCommission(author.id);
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(formPayload(otherAuthor.id, commission.id));

      expect(status).toBe(400);
    });

    it('answers 개수가 questions 개수와 다르면 400을 반환한다', async () => {
      const author = await createAuthor();
      const commission = await createCommission(author.id);
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...formPayload(author.id, commission.id),
          answers: [{ selectedOptions: ['개인소장용'] }],
        });

      expect(status).toBe(400);
    });

    it('SINGLE_SELECT 답변이 options에 없는 값이면 400을 반환한다', async () => {
      const author = await createAuthor();
      const commission = await createCommission(author.id);
      const { accessToken } = await createClient();

      const payload = formPayload(author.id, commission.id);
      payload.answers[0] = { selectedOptions: ['존재하지않는옵션'] };

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload);

      expect(status).toBe(400);
    });

    it('SINGLE_SELECT 답변이 2개면 400을 반환한다', async () => {
      const author = await createAuthor();
      const commission = await createCommission(author.id);
      const { accessToken } = await createClient();

      const payload = formPayload(author.id, commission.id);
      payload.answers[0] = { selectedOptions: ['개인소장용', '상업용'] };

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload);

      expect(status).toBe(400);
    });

    it('필수 TEXT 답변이 빈 문자열이면 400을 반환한다', async () => {
      const author = await createAuthor();
      const commission = await createCommission(author.id);
      const { accessToken } = await createClient();

      const payload = formPayload(author.id, commission.id);
      payload.answers[2] = { text: '   ' } as never;

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload);

      expect(status).toBe(400);
    });

    it('정상 등록 시 201과 id를 반환하고 DB에 Work+Request가 정확히 저장된다', async () => {
      const author = await createAuthor();
      const commission = await createCommission(author.id);
      const { user: client, accessToken } = await createClient();
      const payload = formPayload(author.id, commission.id);

      const { status, body } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload);

      expect(status).toBe(201);
      expect(body.id).toEqual(expect.any(String));

      const work = await prisma.commissionWork.findUniqueOrThrow({
        where: { id: body.id },
      });
      expect(work).toEqual({
        id: body.id,
        authorId: author.id,
        clientId: client.id,
        commissionId: commission.id,
        status: 'PENDING',
        rejectReason: null,
        rejectedAt: null,
        createdAt: expect.any(Date),
      });

      const req = await prisma.commissionRequest.findUniqueOrThrow({
        where: { workId: body.id },
      });
      expect(req.referenceImages).toEqual(payload.referenceImages);
      expect(req.answers).toEqual([
        {
          type: 'SINGLE_SELECT',
          title: '사용용도',
          description: null,
          isRequired: true,
          options: ['개인소장용', '방송/홍보', '상업용'],
          text: null,
          selectedOptions: ['개인소장용'],
          attachedImages: [],
        },
        {
          type: 'MULTI_SELECT',
          title: '원하는 옵션',
          description: null,
          isRequired: false,
          options: ['배경', '소품', '효과'],
          text: null,
          selectedOptions: ['배경', '소품'],
          attachedImages: [],
        },
        {
          type: 'TEXT',
          title: '캐릭터 정보',
          description: null,
          isRequired: true,
          options: [],
          text: '검정 단발머리, 붉은 눈',
          selectedOptions: [],
          attachedImages: [],
        },
      ]);
    });
  });

  describe('DIRECT 모드 (commissionId 없음)', () => {
    it('answer에 type이 없으면 400을 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          authorId: author.id,
          referenceImages: [],
          answers: [{ title: '요청 설명', text: '내용' }],
        });

      expect(status).toBe(400);
    });

    it('answer에 title이 비어있으면 400을 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          authorId: author.id,
          referenceImages: [],
          answers: [{ type: 'TEXT', title: '   ', text: '내용' }],
        });

      expect(status).toBe(400);
    });

    it('필수 TEXT answer가 빈 문자열이면 400을 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          authorId: author.id,
          referenceImages: [],
          answers: [
            { type: 'TEXT', title: '요청 설명', isRequired: true, text: '   ' },
          ],
        });

      expect(status).toBe(400);
    });

    it('SELECT type인데 options가 비어있으면 400을 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          authorId: author.id,
          referenceImages: [],
          answers: [
            {
              type: 'SINGLE_SELECT',
              title: '사용용도',
              isRequired: true,
              options: [],
              selectedOptions: [],
            },
          ],
        });

      expect(status).toBe(400);
    });

    it('answer.text가 2000자 초과면 400을 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          authorId: author.id,
          referenceImages: [],
          answers: [
            { type: 'TEXT', title: '요청 설명', text: 'a'.repeat(2001) },
          ],
        });

      expect(status).toBe(400);
    });

    it('정상 등록 시 201과 id를 반환하고 DB에 Work+Request가 정확히 저장된다', async () => {
      const author = await createAuthor();
      const { user: client, accessToken } = await createClient();
      const payload = directPayload(author.id);

      const { status, body } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload);

      expect(status).toBe(201);
      expect(body.id).toEqual(expect.any(String));

      const work = await prisma.commissionWork.findUniqueOrThrow({
        where: { id: body.id },
      });
      expect(work).toEqual({
        id: body.id,
        authorId: author.id,
        clientId: client.id,
        commissionId: null,
        status: 'PENDING',
        rejectReason: null,
        rejectedAt: null,
        createdAt: expect.any(Date),
      });

      const req = await prisma.commissionRequest.findUniqueOrThrow({
        where: { workId: body.id },
      });
      expect(req.referenceImages).toEqual(payload.referenceImages);
      expect(req.answers).toEqual([
        {
          type: 'TEXT',
          title: '요청 설명',
          description: null,
          isRequired: true,
          options: [],
          text: 'OC 힐링 분위기 배경 포함 일러스트 요청합니다.',
          selectedOptions: [],
          attachedImages: [],
        },
        {
          type: 'TEXT',
          title: '가격 선 제시',
          description: null,
          isRequired: false,
          options: [],
          text: '30000',
          selectedOptions: [],
          attachedImages: [],
        },
      ]);
    });

    it('answers 없이도 정상 등록된다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status, body } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          authorId: author.id,
          referenceImages: [],
        });

      expect(status).toBe(201);

      const req = await prisma.commissionRequest.findUniqueOrThrow({
        where: { workId: body.id },
      });
      expect(req.answers).toEqual([]);
    });
  });

  describe('채팅방 / 시스템 메시지 생성', () => {
    it('기존 채팅방이 없으면 새 채팅방과 COMMISSION_REQUESTED 시스템 메시지를 생성한다', async () => {
      const author = await createAuthor();
      const { user: client, accessToken } = await createClient();

      const { status, body } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(directPayload(author.id));

      expect(status).toBe(201);

      // 신청자-작가가 한 채팅방에 함께 참여
      const chatUsers = await prisma.chatUser.findMany({
        where: { userId: { in: [client.id, author.id] } },
      });
      expect(chatUsers).toHaveLength(2);
      const chatIds = [...new Set(chatUsers.map((cu) => cu.chatId))];
      expect(chatIds).toHaveLength(1);
      const chatId = chatIds[0];

      // 양쪽 모두 enteredAt 처리 → 채팅목록 노출
      const clientChatUser = chatUsers.find((cu) => cu.userId === client.id)!;
      const authorChatUser = chatUsers.find((cu) => cu.userId === author.id)!;
      expect(clientChatUser.enteredAt).not.toBeNull();
      expect(authorChatUser.enteredAt).not.toBeNull();

      // 작가(수신자)만 unread +1, 신청자(발신자)는 0
      expect(authorChatUser.unreadCount).toBe(1);
      expect(clientChatUser.unreadCount).toBe(0);

      // 시스템 메시지 (발신자=신청자, type/referenceId 세팅)
      const messages = await prisma.chatMessage.findMany({ where: { chatId } });
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(
        expect.objectContaining({
          chatId,
          userId: client.id,
          type: 'COMMISSION_REQUESTED',
          referenceId: body.id,
          content: '커미션을 신청했어요',
          images: [],
        }),
      );
    });

    it('기존 채팅방이 있으면 새로 만들지 않고 기존 방에 시스템 메시지를 추가한다', async () => {
      const author = await createAuthor();
      const { user: client, accessToken } = await createClient();

      // 신청자-작가 사이에 이미 채팅방(+ 일반 메시지) 존재
      const existingChat = await prisma.chat.create({
        data: {
          users: {
            createMany: {
              data: [
                { userId: client.id, enteredAt: new Date() },
                { userId: author.id, enteredAt: new Date() },
              ],
            },
          },
          messages: {
            create: { userId: client.id, content: '안녕하세요', images: [] },
          },
        },
        select: { id: true },
      });

      const { status, body } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(directPayload(author.id));

      expect(status).toBe(201);

      // 채팅방 중복 생성 없음 (기존 방 그대로)
      const chatUsers = await prisma.chatUser.findMany({
        where: { userId: { in: [client.id, author.id] } },
      });
      const chatIds = [...new Set(chatUsers.map((cu) => cu.chatId))];
      expect(chatIds).toEqual([existingChat.id]);

      // 기존 방에 시스템 메시지가 추가됨 (기존 일반 메시지 + 시스템 메시지 = 2개)
      const allMessages = await prisma.chatMessage.findMany({
        where: { chatId: existingChat.id },
      });
      expect(allMessages).toHaveLength(2);

      const systemMessage = allMessages.find(
        (m) => m.type === 'COMMISSION_REQUESTED',
      );
      expect(systemMessage).toEqual(
        expect.objectContaining({
          chatId: existingChat.id,
          userId: client.id,
          referenceId: body.id,
          content: '커미션을 신청했어요',
        }),
      );

      // 작가 unread +1
      const authorChatUser = chatUsers.find((cu) => cu.userId === author.id)!;
      expect(authorChatUser.unreadCount).toBe(1);
    });
  });
});
