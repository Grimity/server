import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('DELETE /post-comments/:id - 게시판 댓글 삭제', () => {
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
    const { status } = await request(app.getHttpServer()).delete(
      '/post-comments/1',
    );

    // then
    expect(status).toBe(401);
  });

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/post-comments/1')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(400);
  });

  it('없는 댓글일 때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/post-comments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 상위댓글을 삭제한다 - 하위 댓글이 남아있을 때', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    const parent = await prisma.postComment.create({
      data: {
        postId: post.id,
        writerId: user.id,
        content: 'parent',
      },
    });

    const child = await prisma.postComment.create({
      data: {
        postId: post.id,
        writerId: user.id,
        content: 'child',
        parentId: parent.id,
      },
    });

    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount: 2 },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/post-comments/${parent.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const { body } = await request(app.getHttpServer()).get(
      `/post-comments?postId=${post.id}`,
    );
    expect(body).toEqual([
      {
        id: parent.id,
        content: '',
        createdAt: expect.any(String),
        likeCount: 0,
        isDeleted: true,
        writer: null,
        isLike: false,
        childComments: [
          {
            id: child.id,
            content: 'child',
            createdAt: expect.any(String),
            likeCount: 0,
            writer: {
              id: user.id,
              name: 'test',
            },
            mentionedUser: null,
            isLike: false,
          },
        ],
      },
    ]);
    const afterPost = await prisma.post.findFirstOrThrow();
    expect(afterPost.commentCount).toBe(1);
  });

  it('204와 함께 상위댓글을 삭제한다 - 하위 댓글이 없을 때', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    const parent = await prisma.postComment.create({
      data: {
        postId: post.id,
        writerId: user.id,
        content: 'parent',
      },
    });

    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount: 1 },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/post-comments/${parent.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const { body } = await request(app.getHttpServer()).get(
      `/post-comments?postId=${post.id}`,
    );
    expect(body).toEqual([]);
    const afterPost = await prisma.post.findFirstOrThrow();
    expect(afterPost.commentCount).toBe(0);
  });

  it('204와 함께 대댓글을 삭제한다 - 상위 댓글이 삭제된 상태일 때', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    const parent = await prisma.postComment.create({
      data: {
        postId: post.id,
        writerId: null,
        content: '',
        isDeleted: true,
      },
    });

    const child = await prisma.postComment.create({
      data: {
        postId: post.id,
        writerId: user.id,
        content: 'child',
        parentId: parent.id,
      },
    });

    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount: 1 },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/post-comments/${child.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const postComments = await prisma.postComment.findMany();
    expect(postComments).toHaveLength(0);
    const afterPost = await prisma.post.findFirstOrThrow();
    expect(afterPost.commentCount).toBe(0);
  });

  it('204와 함께 대댓글을 삭제한다 - 상위 댓글이 삭제된 상태에서 다른 대댓글이 있을 때', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    const parent = await prisma.postComment.create({
      data: {
        postId: post.id,
        writerId: null,
        content: '',
        isDeleted: true,
      },
    });

    const [child1, child2] = await Promise.all([
      prisma.postComment.create({
        data: {
          postId: post.id,
          writerId: user.id,
          content: 'child1',
          parentId: parent.id,
        },
      }),
      prisma.postComment.create({
        data: {
          postId: post.id,
          writerId: user.id,
          content: 'child2',
          parentId: parent.id,
        },
      }),
    ]);

    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount: 2 },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/post-comments/${child1.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const { body } = await request(app.getHttpServer()).get(
      `/post-comments?postId=${post.id}`,
    );
    expect(body).toEqual([
      {
        id: parent.id,
        content: '',
        createdAt: expect.any(String),
        likeCount: 0,
        isDeleted: true,
        writer: null,
        isLike: false,
        childComments: [
          {
            id: child2.id,
            content: 'child2',
            createdAt: expect.any(String),
            likeCount: 0,
            writer: {
              id: user.id,
              name: 'test',
            },
            mentionedUser: null,
            isLike: false,
          },
        ],
      },
    ]);
    const afterPost = await prisma.post.findFirstOrThrow();
    expect(afterPost.commentCount).toBe(1);
  });

  it('204와 함께 대댓글을 삭제한다 - 상위 댓글이 삭제되지 않은 상태', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        type: 1,
      },
    });

    const parent = await prisma.postComment.create({
      data: {
        postId: post.id,
        writerId: null,
        content: '',
      },
    });

    const child = await prisma.postComment.create({
      data: {
        postId: post.id,
        writerId: user.id,
        content: 'child',
        parentId: parent.id,
      },
    });

    await prisma.post.update({
      where: { id: post.id },
      data: { commentCount: 2 },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/post-comments/${child.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const { body } = await request(app.getHttpServer()).get(
      `/post-comments?postId=${post.id}`,
    );
    expect(body).toEqual([
      {
        id: parent.id,
        content: '',
        createdAt: expect.any(String),
        likeCount: 0,
        isDeleted: false,
        writer: null,
        isLike: false,
        childComments: [],
      },
    ]);
    const afterPost = await prisma.post.findFirstOrThrow();
    expect(afterPost.commentCount).toBe(1);
  });
});
