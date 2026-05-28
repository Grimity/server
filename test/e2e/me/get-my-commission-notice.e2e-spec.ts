import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /me/commission-notice - 내 커미션 공지 조회', () => {
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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/me/commission-notice')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('공지가 없을 때 notice=null을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({ notice: null });
  });

  it('공지가 있을 때 notice에 title/content/updatedAt을 반환한다', async () => {
    // given
    const { user, accessToken } = await createTestUser(app, {});

    await prisma.commissionNotice.create({
      data: {
        userId: user.id,
        title: '5월 휴가 안내',
        content: '5/3 ~ 5/5 작업 중단합니다.',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      notice: {
        title: '5월 휴가 안내',
        content: '5/3 ~ 5/5 작업 중단합니다.',
        updatedAt: expect.any(String),
      },
    });
  });

  it('다른 유저의 공지는 노출되지 않는다', async () => {
    // given
    const { user: otherUser } = await createTestUser(app, {
      url: 'other',
      providerId: 'other',
      name: 'other',
      email: 'other@example.com',
    });
    const { accessToken } = await createTestUser(app, {});

    await prisma.commissionNotice.create({
      data: {
        userId: otherUser.id,
        title: '다른 유저 공지',
        content: '다른 유저 내용',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({ notice: null });
  });
});
