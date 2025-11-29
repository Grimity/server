import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('PUT /feeds/:id', () => {
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
      .put('/feeds/00000000-0000-0000-0000-000000000000')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put('/feeds/000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('없는 피드를 수정할 때 404를 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put('/feeds/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'updated title',
        content: 'updated content',
        isAI: true,
        cards: ['feed/test3.jpg'],
        tags: ['tag1', 'tag2', 'tag3'],
        thumbnail: 'feed/test3.jpg',
      });

    // then
    expect(status).toBe(404);
  });

  it('albumId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put('/feeds/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'updated title',
        content: 'updated content',
        isAI: true,
        cards: ['feed/test3.jpg'],
        tags: ['tag1', 'tag2', 'tag3'],
        thumbnail: 'feed/test3.jpg',
        albumId: 'INVALID',
      });

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 피드를 수정한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const [feed1] = await Promise.all([
      prisma.feed.create({
        data: {
          title: 'feed1',
          content: 'content1',
          authorId: user.id,
          cards: ['feed/test.jpg', 'feed/test2.jpg'],
          thumbnail: 'feed/test.jpg',
          tags: {
            createMany: {
              data: [
                { tagName: 'tag1' },
                { tagName: 'tag2' },
                { tagName: 'tag3' },
                { tagName: 'tag4' },
              ],
            },
          },
        },
      }),
      prisma.feed.create({
        data: {
          title: 'feed2',
          content: 'content2',
          authorId: user.id,
          thumbnail: 'feed/test.jpg',
          tags: {
            createMany: {
              data: [
                { tagName: 'tag5' },
                { tagName: 'tag6' },
                { tagName: 'tag7' },
                { tagName: 'tag8' },
              ],
            },
          },
        },
      }),
    ]);

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/feeds/${feed1.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'updated title',
        content: 'updated content',
        cards: ['feed/test3.jpg'],
        tags: ['tag1', 'tag2', 'tag3'],
        thumbnail: 'feed/test3.jpg',
      });

    // then
    expect(status).toBe(204);

    const [updatedFeed, tagCount] = await Promise.all([
      prisma.feed.findUniqueOrThrow({
        where: { id: feed1.id },
        include: { tags: true },
      }),
      prisma.tag.count(),
    ]);

    expect(updatedFeed.title).toBe('updated title');
    expect(updatedFeed.content).toBe('updated content');
    expect(updatedFeed.cards).toEqual(['feed/test3.jpg']);
    expect(updatedFeed.tags.map(({ tagName }) => tagName)).toEqual([
      'tag1',
      'tag2',
      'tag3',
    ]);
    expect(tagCount).toBe(7);
    expect(updatedFeed.thumbnail).toBe('feed/test3.jpg');
  });

  it('204와 함께 피드를 수정한다 - albumId가 있는 버전', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const album = await prisma.album.create({
      data: {
        userId: user.id,
        name: 'test1',
        order: 1,
      },
    });

    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'feed1',
        content: 'content1',
        cards: ['feed/test.jpg', 'feed/test2.jpg'],
        thumbnail: 'feed/test.jpg',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/feeds/${feed.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'updated title',
        content: 'updated content',
        cards: ['feed/test3.jpg'],
        tags: ['tag1', 'tag2', 'tag3'],
        thumbnail: 'feed/test3.jpg',
        albumId: album.id,
      });

    // then
    expect(status).toBe(204);
    const updatedFeed = await prisma.feed.findFirstOrThrow();
    expect(updatedFeed.albumId).toBe(album.id);
  });

  it('204와 함께 피드를 수정한다 - albumId가 없는 버전', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const album = await prisma.album.create({
      data: {
        userId: user.id,
        name: 'test1',
        order: 1,
      },
    });

    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'feed1',
        content: 'content1',
        cards: ['feed/test.jpg', 'feed/test2.jpg'],
        thumbnail: 'feed/test.jpg',
        albumId: album.id,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/feeds/${feed.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'updated title',
        content: 'updated content',
        cards: ['feed/test3.jpg'],
        tags: ['tag1', 'tag2', 'tag3'],
        thumbnail: 'feed/test3.jpg',
        albumId: null,
      });

    // then
    expect(status).toBe(204);
    const updatedFeed = await prisma.feed.findFirstOrThrow();
    expect(updatedFeed.albumId).toBe(null);
  });
});
