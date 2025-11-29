import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /post-comments?postId={postId} - 게시판 댓글 조회', () => {
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

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get(
      '/post-comments?postId=1',
    );

    // then
    expect(status).toBe(400);
  });

  it('게시글에 댓글이 없을 때 빈 배열을 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
        url: 'test',
      },
    });

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/post-comments?postId=${post.id}`,
    );

    // then
    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it('200과 함께 댓글을 반환한다', async () => {
    // given
    const { accessToken, user: me } = await createTestUser(app, { name: 'me' });

    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        name: 'test',
        email: 'test@test.com',
        url: 'test2',
      },
    });

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    const [parent1, parent2] = await prisma.postComment.createManyAndReturn({
      data: [
        {
          writerId: user.id,
          postId: post.id,
          content: 'parent1',
          createdAt: new Date('2021-01-01'),
        },
        {
          writerId: user.id,
          postId: post.id,
          content: 'parent2',
          createdAt: new Date('2021-01-02'),
        },
      ],
    });

    const [child1, child2, child3] =
      await prisma.postComment.createManyAndReturn({
        data: [
          {
            writerId: user.id,
            postId: post.id,
            parentId: parent1.id,
            content: 'child1',
            likeCount: 1,
            createdAt: new Date('2021-01-03'),
          },
          {
            writerId: null,
            postId: post.id,
            parentId: parent1.id,
            content: 'child2',
            createdAt: new Date('2021-01-04'),
          },
          {
            writerId: user.id,
            postId: post.id,
            parentId: parent2.id,
            content: 'child3',
            mentionedUserId: user.id,
            createdAt: new Date('2021-01-05'),
          },
        ],
      });

    await prisma.postComment.update({
      where: { id: parent1.id },
      data: { isDeleted: true },
    });

    await prisma.postCommentLike.create({
      data: {
        userId: me.id,
        postCommentId: child1.id,
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get(`/post-comments?postId=${post.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);

    expect(body).toEqual([
      {
        id: parent1.id,
        content: 'parent1',
        createdAt: '2021-01-01T00:00:00.000Z',
        likeCount: 0,
        isDeleted: true,
        writer: {
          id: user.id,
          name: 'test',
          image: null,
          url: 'test2',
        },
        isLike: false,
        childComments: [
          {
            id: child1.id,
            content: 'child1',
            createdAt: expect.any(String),
            likeCount: 1,
            writer: {
              id: user.id,
              name: 'test',
              image: null,
              url: 'test2',
            },
            mentionedUser: null,
            isLike: true,
          },
          {
            id: child2.id,
            content: 'child2',
            createdAt: expect.any(String),
            likeCount: 0,
            writer: null,
            mentionedUser: null,
            isLike: false,
          },
        ],
      },
      {
        id: parent2.id,
        content: 'parent2',
        createdAt: '2021-01-02T00:00:00.000Z',
        likeCount: 0,
        isDeleted: false,
        writer: {
          id: user.id,
          name: 'test',
          image: null,
          url: 'test2',
        },
        isLike: false,
        childComments: [
          {
            id: child3.id,
            content: 'child3',
            createdAt: expect.any(String),
            likeCount: 0,
            writer: {
              id: user.id,
              name: 'test',
              image: null,
              url: 'test2',
            },
            mentionedUser: {
              id: user.id,
              name: 'test',
              image: null,
              url: 'test2',
            },
            isLike: false,
          },
        ],
      },
    ]);
  });
});
