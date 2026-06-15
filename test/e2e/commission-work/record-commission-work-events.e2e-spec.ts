import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SpamDetectionListener } from 'src/module/spam/spam-detection.listener';
import * as request from 'supertest';
import { createTestUser } from '../helper/create-test-user';

describe('커미션 진행 내역(이벤트) 기록', () => {
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
    ],
  });

  async function eventTypesOf(workId: string) {
    const events = await prisma.commissionWorkEvent.findMany({
      where: { workId },
      orderBy: { createdAt: 'asc' },
      select: { type: true },
    });
    return events.map((e) => e.type);
  }

  it('의뢰→수락→업로드→최종→완료 액션이 순서대로 이벤트로 기록된다', async () => {
    const { user: author, accessToken: authorToken } = await createAuthor();
    const { accessToken: clientToken } = await createClient();

    // 1. 의뢰 (신청자)
    const createRes = await request(app.getHttpServer())
      .post('/commission-works')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(directPayload(author.id));
    expect(createRes.status).toBe(201);
    const workId = createRes.body.id;

    // 2. 수락 (작가)
    await request(app.getHttpServer())
      .patch(`/commission-works/${workId}/accept`)
      .set('Authorization', `Bearer ${authorToken}`)
      .expect(200);

    // 3. 작업물 업로드 (작가)
    await request(app.getHttpServer())
      .put(`/commission-works/${workId}/result`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ images: ['v2/commission-work/r1.png'], isFinal: false })
      .expect(200);

    // 4. 최종 업로드 (작가)
    await request(app.getHttpServer())
      .put(`/commission-works/${workId}/result`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ images: ['v2/commission-work/r2.png'], isFinal: true })
      .expect(200);

    // 5. 완료 (신청자)
    await request(app.getHttpServer())
      .patch(`/commission-works/${workId}/complete`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(await eventTypesOf(workId)).toEqual([
      'REQUESTED',
      'ACCEPTED',
      'RESULT_UPLOADED',
      'FINAL_UPLOADED',
      'COMPLETED',
    ]);
  });

  it('의뢰 후 거절하면 REQUESTED, REJECTED가 기록된다', async () => {
    const { user: author, accessToken: authorToken } = await createAuthor();
    const { accessToken: clientToken } = await createClient();

    const createRes = await request(app.getHttpServer())
      .post('/commission-works')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(directPayload(author.id));
    expect(createRes.status).toBe(201);
    const workId = createRes.body.id;

    await request(app.getHttpServer())
      .patch(`/commission-works/${workId}/reject`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ reason: '일정이 맞지 않습니다.' })
      .expect(200);

    expect(await eventTypesOf(workId)).toEqual(['REQUESTED', 'REJECTED']);
  });
});
