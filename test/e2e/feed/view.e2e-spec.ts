import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /:feedId/view', () => {
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

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .put('/feeds/1/view')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('feedId에 해당하는 피드가 없을 때 404를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .put('/feeds/00000000-0000-0000-0000-000000000000/view')
      .send();

    // then
    expect(status).toBe(404);
  });

  it('feedId에 해당하는 피드가 없을 때 404를 반환한다 (로그인)', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/feeds/00000000-0000-0000-0000-000000000000/view')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);

    // cleanup
    spy.mockRestore();
  });

  it('204와 함께 view를 한다 (비로그인)', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
        feeds: {
          create: {
            title: 'test',
            content: 'test',
            isAI: false,
            cards: ['feed/test.jpg'],
          },
        },
      },
      include: {
        feeds: true,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/feeds/${user.feeds[0].id}/view`)
      .send();

    // then
    expect(status).toBe(204);

    const updatedFeed = await prisma.feed.findFirstOrThrow();

    expect(updatedFeed.viewCount).toBe(1);

    // cleanup
    await prisma.user.deleteMany();
  });

  it('204와 함께 view를 한다 (로그인)', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        isAI: false,
        cards: ['feed/test.jpg'],
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/feeds/${feed.id}/view`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);

    const updatedFeed = await prisma.feed.findFirstOrThrow({
      include: {
        views: true,
      },
    });

    expect(updatedFeed.viewCount).toBe(1);
    expect(updatedFeed.views.length).toBe(1);

    // cleanup
    spy.mockRestore();
  });
});
