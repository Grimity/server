import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /me', () => {
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

  it('name이 없을 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: '',
        description: '',
        links: [],
        url: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('name이 13글자 이상일때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'a'.repeat(13),
        description: '',
        links: [],
        url: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('description이 201글자 이상일때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test2',
        description: 'a'.repeat(201),
        links: [],
        url: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('link가 url이 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test',
        description: 'test',
        links: [
          {
            linkName: 'test',
            link: 'test',
          },
        ],
        url: 'test',
      });

    // then
    expect(status).toBe(400);
  });

  it('links가 31개 이상일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test',
        description: 'test',
        url: 'test',
        links: new Array(31).fill({
          linkName: 'test',
          link: 'https://test.com',
        }),
      });

    // then
    expect(status).toBe(400);
  });

  it('linkName이 공백일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test',
        description: 'test',
        url: 'test',
        links: [
          {
            linkName: '     ',
            link: 'https://test.com',
          },
        ],
      });

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 프로필을 수정한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test2',
        description: 'test',
        url: 'test2',
        links: [
          {
            linkName: ' test ',
            link: 'https://test.com',
          },
        ],
      });

    // then
    expect(status).toBe(204);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.name).toBe('test2');
    expect(user.url).toBe('test2');
    expect(user.description).toBe('test');
    expect(user.links).toEqual(['test|~|https://test.com']);
  });

  it('name과 url은 변경사항이 없어도 된다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test',
        description: 'test',
        url: 'test',
        links: [
          {
            linkName: ' test ',
            link: 'https://test.com',
          },
        ],
      });

    // then
    expect(status).toBe(204);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.name).toBe('test');
    expect(user.url).toBe('test');
    expect(user.description).toBe('test');
    expect(user.links).toEqual(['test|~|https://test.com']);
  });

  it('중복된 name일 때 409와 함께 NAME을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        name: 'test2',
        email: 'test@test.com',
        url: 'test2',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test2',
        description: 'test',
        url: 'test',
        links: [
          {
            linkName: 'test',
            link: 'https://test.com',
          },
        ],
      });

    // then
    expect(status).toBe(409);
    expect(body).toEqual({
      statusCode: 409,
      message: 'NAME',
    });
  });

  it('중복된 url일때 409와 함께 URL을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        name: 'test2',
        email: 'test@test.com',
        url: 'test2',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test',
        description: 'test',
        url: 'test2',
        links: [
          {
            linkName: 'test',
            link: 'https://test.com',
          },
        ],
      });

    // then
    expect(status).toBe(409);
    expect(body).toEqual({
      statusCode: 409,
      message: 'URL',
    });
  });

  it('links를 삭제한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    await prisma.user.updateMany({
      data: {
        links: ['test https://test.com', 'test2 https://test2.com'],
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test2',
        description: 'test',
        url: 'test',
        links: [],
      });

    // then
    expect(status).toBe(204);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.links).toEqual([]);
  });

  it('links가 null일 때 빈 배열로 저장한다', async () => {
    // given
    const accessToken = await register(app, 'test');
    await prisma.user.updateMany({
      data: {
        links: ['test https://test.com', 'test2 https://test2.com'],
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'test2',
        description: 'test',
        links: null,
        url: 'test',
      });

    // then
    expect(status).toBe(204);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.links).toEqual([]);
  });
});
