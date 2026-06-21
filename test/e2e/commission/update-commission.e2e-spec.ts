import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';

describe('PUT /commissions/:id - 커미션 수정', () => {
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

  async function createOwner() {
    return await createTestUser(app, {
      url: 'owner',
      name: 'owner',
      providerId: 'owner',
      email: 'owner@example.com',
    });
  }

  async function createOther() {
    return await createTestUser(app, {
      url: 'other',
      name: 'other',
      providerId: 'other',
      email: 'other@example.com',
    });
  }

  async function createCommission(authorId: string) {
    return await prisma.commission.create({
      data: {
        authorId,
        title: '원본 커미션',
        description: '<p>원본 설명</p>',
        additionalCondition: null,
        price: 10000,
        workDays: 7,
        revisionCount: 1,
        images: ['v2/commission/a.png'],
        thumbnail: 'v2/commission/a.png',
        isPublic: true,
        tags: { createMany: { data: [{ tagName: 'old' }] } },
        questions: {
          createMany: {
            data: [
              {
                order: 0,
                type: 'TEXT',
                title: '원본 질문',
                description: null,
                isRequired: true,
                options: [],
              },
            ],
          },
        },
      },
      select: { id: true },
    });
  }

  const updatePayload = () => ({
    title: '수정된 커미션',
    description: '<p>수정된 설명</p>',
    additionalCondition: '<p>조건</p>',
    price: 20000,
    workDays: 14,
    revisionCount: 3,
    images: ['v2/commission/x.png', 'v2/commission/y.png'],
    thumbnail: 'v2/commission/y.png',
    tags: ['new1', 'new2'],
    questions: [
      {
        type: 'SINGLE_SELECT',
        title: '사용용도',
        description: null,
        isRequired: true,
        options: ['개인소장용', '상업용'],
      },
      {
        type: 'TEXT',
        title: '메모',
        description: '자유롭게',
        isRequired: false,
        options: [],
      },
    ],
    isPublic: false,
  });

  it('accessToken이 없으면 401을 반환한다', async () => {
    const { user } = await createOwner();
    const commission = await createCommission(user.id);

    const { status } = await request(app.getHttpServer())
      .put(`/commissions/${commission.id}`)
      .send(updatePayload());

    expect(status).toBe(401);
  });

  it('정상 수정 시 204를 반환하고 DB가 전체 덮어쓰기된다', async () => {
    const { user, accessToken } = await createOwner();
    const commission = await createCommission(user.id);
    const payload = updatePayload();

    const { status } = await request(app.getHttpServer())
      .put(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(status).toBe(204);

    const updated = await prisma.commission.findUniqueOrThrow({
      where: { id: commission.id },
      include: { tags: true, questions: { orderBy: { order: 'asc' } } },
    });

    expect(updated).toEqual({
      id: commission.id,
      authorId: user.id,
      title: payload.title,
      description: payload.description,
      additionalCondition: payload.additionalCondition,
      price: payload.price,
      workDays: payload.workDays,
      revisionCount: payload.revisionCount,
      images: payload.images,
      thumbnail: payload.thumbnail,
      isPublic: false,
      createdAt: expect.any(Date),
      deletedAt: null,
      tags: expect.arrayContaining(
        payload.tags.map((tagName) => ({
          commissionId: commission.id,
          tagName,
        })),
      ),
      questions: payload.questions.map((q, idx) => ({
        commissionId: commission.id,
        order: idx,
        ...q,
      })),
    });
    expect(updated.tags).toHaveLength(payload.tags.length);
    expect(updated.questions).toHaveLength(payload.questions.length);
  });

  it('타인 소유 커미션을 수정하면 404를 반환한다', async () => {
    const { user } = await createOwner();
    const { accessToken: otherToken } = await createOther();
    const commission = await createCommission(user.id);

    const { status } = await request(app.getHttpServer())
      .put(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send(updatePayload());

    expect(status).toBe(404);
  });

  it('이미 삭제된 커미션을 수정하면 404를 반환한다', async () => {
    const { user, accessToken } = await createOwner();
    const commission = await createCommission(user.id);
    await prisma.commission.update({
      where: { id: commission.id },
      data: { deletedAt: new Date() },
    });

    const { status } = await request(app.getHttpServer())
      .put(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updatePayload());

    expect(status).toBe(404);
  });

  it('존재하지 않는 커미션을 수정하면 404를 반환한다', async () => {
    const { accessToken } = await createOwner();

    const { status } = await request(app.getHttpServer())
      .put('/commissions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updatePayload());

    expect(status).toBe(404);
  });

  it('thumbnail이 images에 포함되지 않으면 400을 반환한다', async () => {
    const { user, accessToken } = await createOwner();
    const commission = await createCommission(user.id);

    const { status } = await request(app.getHttpServer())
      .put(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...updatePayload(),
        images: ['v2/commission/x.png'],
        thumbnail: 'v2/commission/y.png',
      });

    expect(status).toBe(400);
  });
});
