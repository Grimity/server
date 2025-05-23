import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';

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

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .put('/feeds/1/view')
      .send();

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 view를 한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
        url: 'test',
        feeds: {
          create: {
            title: 'test',
            content: 'test',
            cards: ['feed/test.jpg'],
            thumbnail: 'feed/test.jpg',
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
  });
});
