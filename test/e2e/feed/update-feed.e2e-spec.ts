import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /feeds/:id', () => {
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
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feeds/000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('없는 피드를 수정할 때 404를 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feeds/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);

    // cleanup
    spy.mockRestore();
  });

  it('204와 함께 피드를 수정한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const [feed1] = await Promise.all([
      prisma.feed.create({
        data: {
          title: 'feed1',
          content: 'content1',
          authorId: user.id,
          cards: ['feed/test.jpg', 'feed/test2.jpg'],
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
        isAI: true,
        cards: ['feed/test3.jpg'],
        tags: ['tag1', 'tag2', 'tag3'],
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
    expect(updatedFeed.isAI).toBe(true);
    expect(updatedFeed.cards).toEqual(['feed/test3.jpg']);
    expect(updatedFeed.tags.map(({ tagName }) => tagName)).toEqual([
      'tag1',
      'tag2',
      'tag3',
    ]);
    expect(tagCount).toBe(7);

    // cleanup
    spy.mockRestore();
  });
});
