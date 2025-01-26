import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('POST /feeds', () => {
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
    const { status } = await request(app.getHttpServer()).post('/feeds').send();

    // then
    expect(status).toBe(401);
  });

  it('title이 없을 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feeds')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '',
        cards: ['feed/test.jpg'],
        isAI: false,
        content: '',
        tags: [],
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('title이 25글자 이상일 때 400을 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feeds')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'a'.repeat(25),
        cards: ['feed/test.jpg'],
        isAI: false,
        content: '',
        tags: [],
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('cards는 하나이상, 10개 이하여야 한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const [{ status }, { status: status2 }] = await Promise.all([
      request(app.getHttpServer())
        .post('/feeds')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'test',
          cards: [],
          isAI: false,
          content: '',
          tags: [],
        }),
      request(app.getHttpServer())
        .post('/feeds')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'test',
          cards: new Array(11).fill('feed/test.jpg'),
          isAI: false,
          content: '',
          tags: [],
        }),
    ]);

    // then
    expect(status).toBe(400);
    expect(status2).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('card는 feed/로 시작하고 확장자를 포함해야한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/feeds')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'test',
        cards: ['test'],
        isAI: false,
        content: '',
        tags: [],
      });

    // then
    expect(status).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('tags는 1글자이상 10글자 이하여야 한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const [{ status }, { status: status2 }] = await Promise.all([
      request(app.getHttpServer())
        .post('/feeds')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'test',
          cards: ['feed/test.jpg'],
          isAI: false,
          content: '',
          tags: [''],
        }),
      request(app.getHttpServer())
        .post('/feeds')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'test',
          cards: ['feed/test.jpg'],
          isAI: false,
          content: '',
          tags: ['a'.repeat(11)],
        }),
    ]);

    // then
    expect(status).toBe(400);
    expect(status2).toBe(400);

    // cleanup
    spy.mockRestore();
  });

  it('201와 함께 feed를 생성한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    const accessToken = await register(app, 'test');

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/feeds')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'test',
        cards: ['feed/test.jpg'],
        isAI: false,
        content: '',
        tags: ['test'],
      });

    // then
    expect(status).toBe(201);
    expect(body).toEqual({
      id: expect.any(String),
    });
    const feed = await prisma.feed.findFirstOrThrow({
      include: {
        tags: true,
      },
    });
    expect(feed).toEqual({
      id: body.id,
      authorId: expect.any(String),
      title: 'test',
      content: '',
      isAI: false,
      cards: ['feed/test.jpg'],
      thumbnail: null,
      tags: [
        {
          feedId: body.id,
          tagName: 'test',
        },
      ],
      createdAt: expect.any(Date),
      likeCount: 0,
      viewCount: 0,
    });

    // cleanup
    spy.mockRestore();
  });
});
