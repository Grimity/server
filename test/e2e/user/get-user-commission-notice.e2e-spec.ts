import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';
import { sampleUuid } from '../helper/sample-uuid';

describe('GET /users/:id/commission-notice - 유저의 커미션 공지 조회', () => {
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

  it(':id가 UUID 형식이 아니면 400을 반환한다', async () => {
    const { status } = await request(app.getHttpServer())
      .get('/users/not-a-uuid/commission-notice')
      .send();

    expect(status).toBe(400);
  });

  it('대상 유저의 공지가 없을 때 notice=null을 반환한다', async () => {
    const { user } = await createTestUser(app, {});

    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${user.id}/commission-notice`)
      .send();

    expect(status).toBe(200);
    expect(body).toEqual({ notice: null });
  });

  it('존재하지 않는 유저의 공지를 조회하면 notice=null을 반환한다', async () => {
    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${sampleUuid}/commission-notice`)
      .send();

    expect(status).toBe(200);
    expect(body).toEqual({ notice: null });
  });

  it('비로그인 상태에서도 대상 유저의 공지를 조회할 수 있다', async () => {
    const { user } = await createTestUser(app, {});

    await prisma.commissionNotice.create({
      data: {
        userId: user.id,
        title: '5월 휴가 안내',
        content: '5/3 ~ 5/5 작업 중단합니다.',
      },
    });

    const { status, body } = await request(app.getHttpServer())
      .get(`/users/${user.id}/commission-notice`)
      .send();

    expect(status).toBe(200);
    expect(body).toEqual({
      notice: {
        title: '5월 휴가 안내',
        content: '5/3 ~ 5/5 작업 중단합니다.',
        updatedAt: expect.any(String),
      },
    });
  });
});
