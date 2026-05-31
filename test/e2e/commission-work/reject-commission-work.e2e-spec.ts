import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommissionWorkStatus } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';

describe('PATCH /commission-works/:id/reject - 커미션 거절', () => {
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

    const { status } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/reject`)
      .send({ reason: '일정이 맞지 않습니다.' });

    expect(status).toBe(401);
  });

  it('workId가 UUID 형식이 아니면 400을 반환한다', async () => {
    const { accessToken } = await createAuthor();

    const { status } = await request(app.getHttpServer())
      .patch('/commission-works/not-a-uuid/reject')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: '일정이 맞지 않습니다.' });

    expect(status).toBe(400);
  });

  it('존재하지 않는 workId면 404를 반환한다', async () => {
    const { accessToken } = await createAuthor();

    const { status, body } = await request(app.getHttpServer())
      .patch('/commission-works/00000000-0000-0000-0000-000000000000/reject')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: '일정이 맞지 않습니다.' });

    expect(status).toBe(404);
    expect(body.errorCode).toBe('WORK_NOT_FOUND');
  });

  it('작가 본인이 아니면 403을 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status, body } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: '일정이 맞지 않습니다.' });

    expect(status).toBe(403);
    expect(body.errorCode).toBe('NOT_COMMISSION_AUTHOR');
  });

  it('PENDING 상태가 아니면 409를 반환한다', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id, 'IN_PROGRESS');

    const { status, body } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: '일정이 맞지 않습니다.' });

    expect(status).toBe(409);
    expect(body.errorCode).toBe('WORK_NOT_PENDING');
  });

  it('reason이 500자를 초과하면 400을 반환한다', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'a'.repeat(501) });

    expect(status).toBe(400);
  });

  it('정상 거절 시 200과 id를 반환하고 DB에 REJECTED 상태와 사유/시각이 저장된다', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status, body } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: '죄송하지만 일정이 맞지 않아 거절합니다.' });

    expect(status).toBe(200);
    expect(body.id).toBe(work.id);

    const updated = await prisma.commissionWork.findUniqueOrThrow({
      where: { id: work.id },
    });
    expect(updated.status).toBe('REJECTED');
    expect(updated.rejectReason).toBe('죄송하지만 일정이 맞지 않아 거절합니다.');
    expect(updated.rejectedAt).toEqual(expect.any(Date));
  });

  it('reason 없이도 정상 거절되고 rejectReason은 null로 저장된다', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer())
      .patch(`/commission-works/${work.id}/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(status).toBe(200);

    const updated = await prisma.commissionWork.findUniqueOrThrow({
      where: { id: work.id },
    });
    expect(updated.status).toBe('REJECTED');
    expect(updated.rejectReason).toBeNull();
    expect(updated.rejectedAt).toEqual(expect.any(Date));
  });
});
