import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommissionWorkStatus } from '@prisma/client';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';

describe('POST /commission-works/:id/reviews - 커미션 후기(유저 평가) 작성', () => {
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

  async function createStranger() {
    return await createTestUser(app, {
      url: 'stranger',
      name: 'stranger',
      providerId: 'stranger',
      email: 'stranger@example.com',
    });
  }

  async function createWork(
    authorId: string,
    clientId: string,
    status: CommissionWorkStatus = 'COMPLETED',
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
      .post(`/commission-works/${work.id}/reviews`)
      .send({ rating: 'SATISFIED' });

    expect(status).toBe(401);
  });

  it('workId가 UUID 형식이 아니면 400을 반환한다', async () => {
    const { accessToken } = await createClient();

    const { status } = await request(app.getHttpServer())
      .post('/commission-works/not-a-uuid/reviews')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'SATISFIED' });

    expect(status).toBe(400);
  });

  it('rating이 없으면 400을 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(status).toBe(400);
  });

  it('rating이 허용된 값이 아니면 400을 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'INVALID' });

    expect(status).toBe(400);
  });

  it('후기(content)가 500자를 초과하면 400을 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'SATISFIED', content: 'a'.repeat(501) });

    expect(status).toBe(400);
  });

  it('존재하지 않는 workId면 404를 반환한다', async () => {
    const { accessToken } = await createClient();

    const { status, body } = await request(app.getHttpServer())
      .post('/commission-works/00000000-0000-0000-0000-000000000000/reviews')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'SATISFIED' });

    expect(status).toBe(404);
    expect(body.errorCode).toBe('WORK_NOT_FOUND');
  });

  it('작가/의뢰인 어느 쪽도 아니면 403을 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client } = await createClient();
    const { accessToken } = await createStranger();
    const work = await createWork(author.id, client.id);

    const { status, body } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'SATISFIED' });

    expect(status).toBe(403);
    expect(body.errorCode).toBe('NOT_COMMISSION_PARTICIPANT');
  });

  it('COMPLETED 상태가 아니면 409를 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id, 'ACCEPTED');

    const { status, body } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'SATISFIED' });

    expect(status).toBe(409);
    expect(body.errorCode).toBe('WORK_NOT_COMPLETED');
  });

  it('의뢰인이 후기 작성 시 201과 id를 반환하고 DB에 저장된다 (reviewee=작가)', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status, body } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'SATISFIED', content: '좋은 작업 감사합니다' });

    expect(status).toBe(201);
    expect(typeof body.id).toBe('string');

    const review = await prisma.commissionReview.findUniqueOrThrow({
      where: { workId_reviewerId: { workId: work.id, reviewerId: client.id } },
    });
    expect(review.id).toBe(body.id);
    expect(review.revieweeId).toBe(author.id);
    expect(review.rating).toBe('SATISFIED');
    expect(review.content).toBe('좋은 작업 감사합니다');
  });

  it('작가가 후기 작성 시 201과 id를 반환한다 (reviewee=의뢰인)', async () => {
    const { user: author, accessToken } = await createAuthor();
    const { user: client } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'NORMAL' });

    expect(status).toBe(201);

    const review = await prisma.commissionReview.findUniqueOrThrow({
      where: { workId_reviewerId: { workId: work.id, reviewerId: author.id } },
    });
    expect(review.revieweeId).toBe(client.id);
    expect(review.rating).toBe('NORMAL');
  });

  it('content 없이도 후기를 작성할 수 있고 content는 null로 저장된다', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id);

    const { status, body } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'DISSATISFIED' });

    expect(status).toBe(201);

    const review = await prisma.commissionReview.findUniqueOrThrow({
      where: { id: body.id },
    });
    expect(review.content).toBeNull();
  });

  it('이미 후기를 작성했으면 409를 반환한다', async () => {
    const { user: author } = await createAuthor();
    const { user: client, accessToken } = await createClient();
    const work = await createWork(author.id, client.id);

    await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'SATISFIED' });

    const { status, body } = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rating: 'NORMAL' });

    expect(status).toBe(409);
    expect(body.errorCode).toBe('ALREADY_REVIEWED');
  });

  it('같은 커미션에 의뢰인과 작가가 각각 1회씩 후기를 작성할 수 있다', async () => {
    const { user: author, accessToken: authorToken } = await createAuthor();
    const { user: client, accessToken: clientToken } = await createClient();
    const work = await createWork(author.id, client.id);

    const clientRes = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ rating: 'SATISFIED' });

    const authorRes = await request(app.getHttpServer())
      .post(`/commission-works/${work.id}/reviews`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ rating: 'NORMAL' });

    expect(clientRes.status).toBe(201);
    expect(authorRes.status).toBe(201);

    const count = await prisma.commissionReview.count({
      where: { workId: work.id },
    });
    expect(count).toBe(2);
  });
});
