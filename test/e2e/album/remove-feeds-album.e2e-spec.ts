import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('PUT /albums/null - 앨범에서 피드 빼기', () => {
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
    const { status } = await request(app.getHttpServer()).put('/albums/null');

    // then
    expect(status).toBe(401);
  });

  it('피드는 최소 1개 이상 있어야한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/null')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('UUID 형식이 아닐 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/null')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: ['invalid'],
      });

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 피드의 앨범ID를 null로 변경한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const album = await prisma.album.create({
      data: {
        name: 'test',
        order: 1,
        userId: user.id,
      },
    });

    const feeds = await prisma.feed.createManyAndReturn({
      data: [
        {
          title: 'test',
          content: 'test',
          thumbnail: '',
          albumId: album.id,
          authorId: user.id,
        },
        {
          title: 'test',
          content: 'test',
          thumbnail: '',
          albumId: album.id,
          authorId: user.id,
        },
      ],
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/null')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: feeds.map(({ id }) => id),
      });

    // then
    expect(status).toBe(204);

    const afterFeeds = await prisma.feed.findMany({
      where: {
        albumId: null,
      },
    });

    expect(afterFeeds.length).toBe(2);
  });
});
