import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';

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
      .get('/feeds/following')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('200과 함께 팔로잉 피드를 조회한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const me = await prisma.user.findFirstOrThrow();

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        name: 'test2',
        email: 'test@test.com',
        url: 'test2',
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
        title: 'test5',
        content: 'test',
        thumbnail: 'test',
        createdAt: new Date('2020-01-01'),
        likes: {
          create: {
            userId: me.id,
          },
        },
      },
    });

    await prisma.feed.createMany({
      data: [
        {
          authorId: user.id,
          title: 'test',
          content: 'test',
          thumbnail: 'test',
          createdAt: new Date('2021-01-01'),
        },
        {
          authorId: user.id,
          title: 'test2',
          content: 'test',
          thumbnail: 'test',
          createdAt: new Date('2021-01-02'),
        },
        {
          authorId: user.id,
          title: 'test3',
          content: 'test',
          thumbnail: 'test',
          createdAt: new Date('2021-01-03'),
        },
        {
          authorId: user.id,
          title: 'test4',
          content: 'test',
          thumbnail: 'test',
          createdAt: new Date('2021-01-04'),
        },
      ],
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/feeds/following?size=2')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get(`/feeds/following?size=2&cursor=${body.nextCursor}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(status2).toBe(200);

    expect(body.nextCursor).not.toBeNull();
    expect(body.feeds).toHaveLength(2);
    expect(body.feeds[0].title).toBe('test4');
    expect(body.feeds[1].title).toBe('test3');
    expect(body2.feeds).toHaveLength(2);
    expect(body2.feeds[0].title).toBe('test2');
    expect(body2.feeds[1].title).toBe('test');
  });
});
