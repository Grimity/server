import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /commissions/:id - 커미션 삭제 (soft delete)', () => {
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
        isPublic: true,
        tags: { createMany: { data: [{ tagName: 'SD' }] } },
        questions: {
          createMany: {
            data: [
              {
                order: 0,
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
      select: { id: true },
    });
  }

  it('accessToken이 없으면 401을 반환한다', async () => {
    const { user } = await createOwner();
    const commission = await createCommission(user.id);

    const { status } = await request(app.getHttpServer()).delete(
      `/commissions/${commission.id}`,
    );

    expect(status).toBe(401);
  });

  it('정상 삭제 시 204를 반환하고 deletedAt이 세팅되며 자식(tag/question)은 보존된다', async () => {
    const { user, accessToken } = await createOwner();
    const commission = await createCommission(user.id);

    const { status } = await request(app.getHttpServer())
      .delete(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status).toBe(204);

    const deleted = await prisma.commission.findUniqueOrThrow({
      where: { id: commission.id },
      include: { tags: true, questions: true },
    });
    expect(deleted.deletedAt).toEqual(expect.any(Date));
    expect(deleted.tags).toHaveLength(1);
    expect(deleted.questions).toHaveLength(1);
  });

  it('타인 소유 커미션을 삭제하면 404를 반환한다', async () => {
    const { user } = await createOwner();
    const { accessToken: clientToken } = await createClient();
    const commission = await createCommission(user.id);

    const { status } = await request(app.getHttpServer())
      .delete(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(status).toBe(404);

    const stillAlive = await prisma.commission.findUniqueOrThrow({
      where: { id: commission.id },
    });
    expect(stillAlive.deletedAt).toBeNull();
  });

  it('이미 삭제된 커미션을 다시 삭제하면 404를 반환한다', async () => {
    const { user, accessToken } = await createOwner();
    const commission = await createCommission(user.id);

    await request(app.getHttpServer())
      .delete(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    const { status } = await request(app.getHttpServer())
      .delete(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status).toBe(404);
  });

  it('연결된 진행 거래(CommissionWork)는 삭제 후에도 보존된다', async () => {
    const { user, accessToken } = await createOwner();
    const { user: client } = await createClient();
    const commission = await createCommission(user.id);

    const work = await prisma.commissionWork.create({
      data: {
        authorId: user.id,
        clientId: client.id,
        commissionId: commission.id,
        status: 'PENDING',
      },
      select: { id: true },
    });

    const { status } = await request(app.getHttpServer())
      .delete(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(status).toBe(204);

    const preserved = await prisma.commissionWork.findUniqueOrThrow({
      where: { id: work.id },
    });
    expect(preserved.commissionId).toBe(commission.id);
  });

  it('삭제된 커미션에 FORM 신청하면 404(COMMISSION_NOT_FOUND)를 반환한다', async () => {
    const { user, accessToken } = await createOwner();
    const { accessToken: clientToken } = await createClient();
    const commission = await createCommission(user.id);

    await request(app.getHttpServer())
      .delete(`/commissions/${commission.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    const { status, body } = await request(app.getHttpServer())
      .post('/commission-works')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        authorId: user.id,
        commissionId: commission.id,
        referenceImages: [],
        answers: [{ text: '안녕하세요' }],
      });

    expect(status).toBe(404);
    expect(body.errorCode).toBe('COMMISSION_NOT_FOUND');
  });
});
