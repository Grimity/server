import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';
import { createVerifiedTestUser } from '../helper/create-verified-test-user';

describe('PUT /me/commission-notice - 내 커미션 공지 등록/수정', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    title: '5월 휴가 안내',
    content: '5/3 ~ 5/5 작업 중단합니다.',
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    const { status } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .send(validPayload());

    expect(status).toBe(401);
  });

  it('본인인증을 안 한 유저가 호출하면 422 NOT_VERIFIED를 반환한다', async () => {
    const { accessToken } = await createTestUser(app, {});

    const { status, body } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validPayload());

    expect(status).toBe(422);
    expect(body).toEqual({ status: 422, errorCode: 'NOT_VERIFIED' });
  });

  it('title이 비었을 때 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), title: '   ' });

    expect(status).toBe(400);
  });

  it('title이 101자 이상이면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), title: 'a'.repeat(101) });

    expect(status).toBe(400);
  });

  it('content가 비었을 때 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), content: '   ' });

    expect(status).toBe(400);
  });

  it('content가 501자 이상이면 400을 반환한다', async () => {
    const { accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validPayload(), content: 'a'.repeat(501) });

    expect(status).toBe(400);
  });

  it('정상 등록 시 200을 반환하고 DB에 저장된다', async () => {
    const { user, accessToken } = await createVerifiedTestUser(app, {});
    const payload = validPayload();

    const { status, body } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(status).toBe(200);
    expect(body).toEqual({
      notice: {
        title: payload.title,
        content: payload.content,
        updatedAt: expect.any(String),
      },
    });

    const saved = await prisma.commissionNotice.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(saved).toEqual({
      userId: user.id,
      title: payload.title,
      content: payload.content,
      updatedAt: expect.any(Date),
    });
  });

  it('title/content를 trim해서 저장한다', async () => {
    const { user, accessToken } = await createVerifiedTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '  공지제목  ', content: '  공지내용  ' });

    expect(status).toBe(200);

    const saved = await prisma.commissionNotice.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(saved.title).toBe('공지제목');
    expect(saved.content).toBe('공지내용');
  });

  it('이미 공지가 있는 유저가 다시 호출하면 덮어쓴다 (1인 1공지)', async () => {
    const { user, accessToken } = await createVerifiedTestUser(app, {});

    await prisma.commissionNotice.create({
      data: { userId: user.id, title: '기존 제목', content: '기존 내용' },
    });

    const { status, body } = await request(app.getHttpServer())
      .put('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: '새 제목', content: '새 내용' });

    expect(status).toBe(200);
    expect(body.notice).toMatchObject({ title: '새 제목', content: '새 내용' });

    const all = await prisma.commissionNotice.findMany({
      where: { userId: user.id },
    });
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('새 제목');
    expect(all[0].content).toBe('새 내용');
  });
});
