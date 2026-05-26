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
    description: 'OC 힐링 분위기 배경 포함 일러스트 요청합니다.',
    proposedPrice: 30000,
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

    it('FORM 모드에서 description을 같이 보내면 400을 반환한다', async () => {
      const author = await createAuthor();
      const commission = await createCommission(author.id);
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...formPayload(author.id, commission.id), description: 'x' });

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
        createdAt: expect.any(Date),
      });

      const req = await prisma.commissionRequest.findUniqueOrThrow({
        where: { workId: body.id },
      });
      expect(req.description).toBeNull();
      expect(req.proposedPrice).toBeNull();
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
        },
        {
          type: 'MULTI_SELECT',
          title: '원하는 옵션',
          description: null,
          isRequired: false,
          options: ['배경', '소품', '효과'],
          text: null,
          selectedOptions: ['배경', '소품'],
        },
        {
          type: 'TEXT',
          title: '캐릭터 정보',
          description: null,
          isRequired: true,
          options: [],
          text: '검정 단발머리, 붉은 눈',
          selectedOptions: [],
        },
      ]);
    });
  });

  describe('DIRECT 모드 (commissionId 없음)', () => {
    it('description이 없으면 400을 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          authorId: author.id,
          referenceImages: [],
        });

      expect(status).toBe(400);
    });

    it('description이 500자 초과면 400을 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...directPayload(author.id),
          description: 'a'.repeat(501),
        });

      expect(status).toBe(400);
    });

    it('answers가 같이 오면 400을 반환한다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...directPayload(author.id),
          answers: [{ text: 'x' }],
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
        createdAt: expect.any(Date),
      });

      const req = await prisma.commissionRequest.findUniqueOrThrow({
        where: { workId: body.id },
      });
      expect(req.description).toBe(payload.description);
      expect(req.proposedPrice).toBe(payload.proposedPrice);
      expect(req.referenceImages).toEqual(payload.referenceImages);
      expect(req.answers).toEqual([]);
    });

    it('proposedPrice 없이도 정상 등록된다', async () => {
      const author = await createAuthor();
      const { accessToken } = await createClient();

      const { status, body } = await request(app.getHttpServer())
        .post('/commission-works')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          authorId: author.id,
          referenceImages: [],
          description: '간단한 의뢰입니다.',
        });

      expect(status).toBe(201);

      const req = await prisma.commissionRequest.findUniqueOrThrow({
        where: { workId: body.id },
      });
      expect(req.proposedPrice).toBeNull();
    });
  });
});
