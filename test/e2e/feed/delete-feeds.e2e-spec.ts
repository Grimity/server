import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { createTestUser } from '../helper/create-test-user';

describe('POST /feeds/batch-delete - 피드 여러개 삭제', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);

    jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accessToken이 없으면 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/feeds/batch-delete')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('피드는 최소 1개 있어야 한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feeds/batch-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('UUID 형식이 아닐 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feeds/batch-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: ['00000000-0000-0000-0000-000000000000'],
      });

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 피드를 삭제한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const feeds = await prisma.feed.createManyAndReturn({
      data: [
        {
          authorId: user.id,
          title: 'title1',
          content: 'content1',
          thumbnail: 'test1',
          cards: [],
        },
        {
          authorId: user.id,
          title: 'title2',
          content: 'content2',
          thumbnail: 'test2',
          cards: [],
        },
      ],
    });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feeds/batch-delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: [feeds[0].id, feeds[1].id],
      });

    // then
    const afterFeeds = await prisma.feed.findMany();
    expect(afterFeeds.length).toBe(0);
  });
});
