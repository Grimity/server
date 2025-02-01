import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('GET /feed-comments/child-comments - 자식 댓글 조회', () => {
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
    await prisma.feedComment.deleteMany();
  });

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .get('/feed-comments/child-comments')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        feedId: '1',
        parentId: '00000000-0000-0000-0000-000000000000',
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('parentId가 없을 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .get('/feed-comments/child-comments')
      .query({
        feedId: '00000000-0000-0000-0000-000000000000',
      });

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 자식 댓글을 반환한다', async () => {
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
      },
    });

    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        content: 'test',
        thumbnail: 'test',
        title: 'test',
      },
    });

    const parentComment = await prisma.feedComment.create({
      data: {
        content: 'test',
        feedId: feed.id,
        writerId: user.id,
      },
    });

    const childComment = await prisma.feedComment.create({
      data: {
        content: 'test',
        feedId: feed.id,
        writerId: me.id,
        parentId: parentComment.id,
        mentionedUserId: user.id,
        likes: {
          create: {
            userId: me.id,
          },
        },
        likeCount: 1,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/feed-comments/child-comments')
      .query({
        feedId: feed.id,
        parentId: parentComment.id,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual({
      id: childComment.id,
      content: 'test',
      likeCount: 1,
      isLike: true,
      createdAt: expect.any(String),
      writer: {
        id: me.id,
        name: me.name,
        image: null,
      },
      mentionedUser: {
        id: user.id,
        name: user.name,
      },
    });

    // cleanup
    spy.mockRestore();
  });
});
