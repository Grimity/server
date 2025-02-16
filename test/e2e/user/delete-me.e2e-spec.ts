import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('DELETE /users/me - 회원탈퇴', () => {
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

  it('accessToken이 없을 때 401을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/me')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 모든 데이터를 삭제하지만 postComment는 남긴다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const [user, user2] = await Promise.all([
      prisma.user.findFirstOrThrow(),
      prisma.user.create({
        data: {
          provider: 'KAKAO',
          providerId: 'test2',
          email: 'test@test.com',
          name: 'test2',
        },
      }),
    ]);

    const [feed, _, post] = await Promise.all([
      prisma.feed.create({
        data: {
          authorId: user.id,
          title: 'feed',
          content: 'feed',
          thumbnail: 'thumbnail',
        },
      }),
      prisma.post.create({
        data: {
          authorId: user.id,
          content: 'post',
          title: 'post',
          type: 1,
        },
      }),
      prisma.post.create({
        data: {
          authorId: user2.id,
          content: 'post',
          title: 'post',
          type: 1,
        },
      }),
    ]);

    await Promise.all([
      prisma.postComment.create({
        data: {
          writerId: user.id,
          postId: post.id,
          content: 'comment',
        },
      }),
      prisma.feedComment.create({
        data: {
          writerId: user.id,
          feedId: feed.id,
          content: 'comment',
        },
      }),
    ]);

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);

    const [userCount, feedCount, postCount, postCommentCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.feed.count(),
        prisma.post.count(),
        prisma.postComment.count(),
      ]);

    expect(userCount).toBe(1);
    expect(feedCount).toBe(0);
    expect(postCount).toBe(1);
    expect(postCommentCount).toBe(1);
  });
});
