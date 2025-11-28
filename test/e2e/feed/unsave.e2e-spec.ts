import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /feeds/:id/save - 피드 저장 취소', () => {
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
      .delete('/feeds/1/save')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feeds/1/save')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 unsave를 한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    const user = await prisma.user.findFirstOrThrow();
    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        cards: ['feed/test.jpg'],
        thumbnail: 'feed/test.jpg',
      },
    });

    await request(app.getHttpServer())
      .put(`/feeds/${feed.id}/save`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/feeds/${feed.id}/save`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const saved = await prisma.save.findFirst();
    expect(saved).toBeNull();
  });
});
