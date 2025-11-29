import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('POST /reports - 신고하기', () => {
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
    await prisma.report.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/reports')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('type이 없을 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, { name: 'test' });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        refType: 'FEED',
        refId: '00000000-0000-0000-0000-000000000000',
        content: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('refType이 유효하지 않을 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, { name: 'test' });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: '사칭계정',
        refType: 'INVALID',
        refId: '00000000-0000-0000-0000-000000000000',
        content: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('refId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, { name: 'test' });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: '사칭계정',
        refType: 'FEED',
        refId: 'invalid',
        content: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('201과 함께 신고를 생성한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, { name: 'test' });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: '사칭계정',
        refType: 'FEED',
        refId: '00000000-0000-0000-0000-000000000000',
        content: 'test',
      });

    // then
    expect(status).toBe(201);
    const report = await prisma.report.findFirstOrThrow();
    expect(report).toEqual({
      id: expect.any(String),
      userId: expect.any(String),
      type: '사칭계정',
      refType: 'FEED',
      refId: '00000000-0000-0000-0000-000000000000',
      content: 'test',
      createdAt: expect.any(Date),
    });
  });

  it('content가 없어도 동작한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, { name: 'test' });

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: '사칭계정',
        refType: 'FEED',
        refId: '00000000-0000-0000-0000-000000000000',
      });

    // then
    expect(status).toBe(201);
    const report = await prisma.report.findFirstOrThrow();
    expect(report).toEqual({
      id: expect.any(String),
      userId: expect.any(String),
      type: '사칭계정',
      refType: 'FEED',
      refId: '00000000-0000-0000-0000-000000000000',
      content: null,
      createdAt: expect.any(Date),
    });
  });

  it('content가 null이어도 동작한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, { name: 'test' });

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: '사칭계정',
        refType: 'FEED',
        refId: '00000000-0000-0000-0000-000000000000',
        content: null,
      });

    // then
    expect(status).toBe(201);
    const report = await prisma.report.findFirstOrThrow();
    expect(report).toEqual({
      id: expect.any(String),
      userId: expect.any(String),
      type: '사칭계정',
      refType: 'FEED',
      refId: '00000000-0000-0000-0000-000000000000',
      content: null,
      createdAt: expect.any(Date),
    });
  });

  it('content가 공백이면 null로 저장한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, { name: 'test' });

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/reports')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: '사칭계정',
        refType: 'FEED',
        refId: '00000000-0000-0000-0000-000000000000',
        content: '',
      });

    // then
    expect(status).toBe(201);
    const report = await prisma.report.findFirstOrThrow();
    expect(report).toEqual({
      id: expect.any(String),
      userId: expect.any(String),
      type: '사칭계정',
      refType: 'FEED',
      refId: '00000000-0000-0000-0000-000000000000',
      content: null,
      createdAt: expect.any(Date),
    });
  });
});
