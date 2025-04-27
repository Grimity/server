import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /albums/:id - 앨범에 피드 넣기', () => {
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
    const { status } = await request(app.getHttpServer()).put(
      '/albums/00000000-0000-0000-0000-000000000000',
    );

    // then
    expect(status).toBe(401);
  });

  it('피드는 최소 1개 이상 있어야한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('UUID 형식이 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/INVALID')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('요청자와 앨범소유자가 다르면 403를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test1');

    const user2 = await prisma.user.create({
      data: {
        name: 'test2',
        provider: 'KAKAO',
        providerId: 'test2',
        url: 'test2',
        email: 'test2@test.com',
      },
    });

    const album = await prisma.album.create({
      data: {
        userId: user2.id,
        name: 'test',
        order: 1,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/albums/${album.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: ['00000000-0000-0000-0000-000000000000'],
      });

    // then
    expect(status).toBe(403);
  });

  it('앨범이 없으면 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test1');

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/albums/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: ['00000000-0000-0000-0000-000000000000'],
      });

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 피드를 앨범으로 이동시킨다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    const album = await prisma.album.create({
      data: {
        name: 'test',
        order: 1,
        userId: user.id,
      },
    });

    const feeds = await prisma.feed.createManyAndReturn({
      data: new Array(10).fill(0).map((_, index) => ({
        authorId: user.id,
        title: `title${index}`,
        content: `content${index}`,
        thumbnail: 'test',
      })),
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/albums/${album.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ids: feeds.map(({ id }) => id),
      });

    // then
    expect(status).toBe(204);

    const count = await prisma.feed.count({
      where: {
        albumId: album.id,
      },
    });

    expect(count).toBe(10);
  });
});
