import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /feeds/following - 팔로잉 피드 조회', () => {
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

  it('accessToken이 없으면 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/feeds/following')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 팔로잉 피드를 조회한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    const me = await prisma.user.findFirstOrThrow();

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        name: 'test2',
        email: 'test@test.com',
        followers: {
          create: {
            followerId: me.id,
          },
        },
      },
    });

    await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        likes: {
          create: {
            userId: me.id,
          },
        },
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/feeds/following')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body.nextCursor).toBeNull();
    expect(body.feeds).toHaveLength(1);
    console.log(body.feeds);

    // cleanup
    spy.mockRestore();
  });
});
