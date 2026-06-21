import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';
import { createVerifiedTestUser } from '../helper/create-verified-test-user';

describe('POST /commissions - 커미션 등록', () => {
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

  const validPayload = () => ({
    title: 'SD 커미션',
    description: '<p>설명</p>',
    additionalCondition: '<p>조건</p>',
    price: 10000,
    workDays: 7,
    revisionCount: 0,
    images: ['v2/commission/a.png', 'v2/commission/b.png'],
    thumbnail: 'v2/commission/a.png',
    tags: ['SD', '오마카세'],
    questions: [
      {
        type: 'SINGLE_SELECT',
        title: '사용용도',
        description: null,
        isRequired: true,
        options: ['개인소장용', '방송/홍보', '상업용'],
      },
      {
        type: 'TEXT',
        title: '캐릭터 신청 인원수',
        description: '인원수를 적어주세요',
        isRequired: true,
        options: [],
      },
    ],
    isPublic: true,
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .send(validPayload());

    expect(status).toBe(401);
  });

  it('본인인증을 안 한 유저가 호출하면 422 NOT_VERIFIED를 반환한다', async () => {
    const { accessToken } = await createTestUser(app, {});

    const { status, body } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validPayload());

    expect(status).toBe(422);
    expect(body).toEqual({ status: 422, errorCode: 'NOT_VERIFIED' });
  });

  it('title이 비었을 때 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), title: '   ' });

    expect(status).toBe(400);
  });

  it('title이 61자 이상이면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), title: 'a'.repeat(61) });

    expect(status).toBe(400);
  });

  it('price가 0(무료)이어도 201을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), price: 0 });

    expect(status).toBe(201);
  });

  it('images가 빈 배열이면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), images: [], thumbnail: 'x' });

    expect(status).toBe(400);
  });

  it('thumbnail이 images에 포함되지 않으면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...validPayload(),
        images: ['v2/commission/a.png'],
        thumbnail: 'v2/commission/b.png',
      });

    expect(status).toBe(400);
  });

  it('SELECT 타입 질문의 options가 비어있으면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...validPayload(),
        questions: [
          {
            type: 'SINGLE_SELECT',
            title: 'q',
            description: null,
            isRequired: true,
            options: [],
          },
        ],
      });

    expect(status).toBe(400);
  });

  it('TEXT 타입 질문에 options가 들어있으면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...validPayload(),
        questions: [
          {
            type: 'TEXT',
            title: 'q',
            description: null,
            isRequired: true,
            options: ['nope'],
          },
        ],
      });

    expect(status).toBe(400);
  });

  it('tags가 11개 이상이면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...validPayload(),
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
      });

    expect(status).toBe(400);
  });

  it('questions가 21개 이상이면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...validPayload(),
        questions: Array.from({ length: 21 }, (_, i) => ({
          type: 'TEXT',
          title: `q${i}`,
          description: null,
          isRequired: false,
          options: [],
        })),
      });

    expect(status).toBe(400);
  });

  it('정상 등록 시 201과 id를 반환하고 DB에 정확히 저장된다', async () => {
    const { user, accessToken } = await createVerifiedTestUser(app, {});
    const payload = validPayload();

    const { status, body } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(status).toBe(201);
    expect(body.id).toEqual(expect.any(String));

    const commission = await prisma.commission.findFirstOrThrow({
      include: { tags: true, questions: { orderBy: { order: 'asc' } } },
    });
    expect(commission).toEqual({
      id: body.id,
      authorId: user.id,
      title: payload.title,
      description: payload.description,
      additionalCondition: payload.additionalCondition,
      price: payload.price,
      workDays: payload.workDays,
      revisionCount: payload.revisionCount,
      images: payload.images,
      thumbnail: payload.thumbnail,
      isPublic: payload.isPublic,
      createdAt: expect.any(Date),
      deletedAt: null,
      tags: expect.arrayContaining(
        payload.tags.map((tagName) => ({ commissionId: body.id, tagName })),
      ),
      questions: payload.questions.map((q, idx) => ({
        commissionId: body.id,
        order: idx,
        ...q,
      })),
    });
    expect(commission.tags).toHaveLength(payload.tags.length);
  });

  it('태그를 중복으로 보내면 dedup 되어 저장된다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status, body } = await request(app.getHttpServer())
      .post('/commissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), tags: ['SD', 'SD', '# SD', 'SD '] });

    expect(status).toBe(201);

    const tags = await prisma.commissionTag.findMany({
      where: { commissionId: body.id },
    });
    expect(tags).toEqual([{ commissionId: body.id, tagName: 'SD' }]);
  });
});
