import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /feed-comments/:commentId', () => {
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
      .delete('/feed-comments/1')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('commentId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feed-comments/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 댓글을 삭제한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        thumbnail: 'test',
      },
    });
    const comment = await prisma.feedComment.create({
      data: {
        writerId: user.id,
        feedId: feed.id,
        content: 'test',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/feed-comments/${comment.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);

    const deletedComment = await prisma.feedComment.findFirst();
    expect(deletedComment).toBeNull();
  });
});
