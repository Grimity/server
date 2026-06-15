import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('POST /images/get-upload-url - presignedURL 발급', () => {
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

  it('type은 profile, feed 중 하나여야 한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'invalid',
        ext: 'jpg',
      });

    // then
    expect(status).toBe(400);
  });

  it('ext는 webp여야 한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'feed',
        ext: 'invalid',
      });

    // then
    expect(status).toBe(400);
  });

  it('width와 height가 주어지면 v2 경로 + 가로x세로 형식의 파일명이 생성된다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'profile',
        ext: 'webp',
        width: 100,
        height: 200,
      });

    // then
    expect(status).toBe(200);
    expect(body.uploadUrl).toBeDefined();
    expect(body.imageName).toMatch(
      /^v2\/profile\/[a-f0-9\-]{36}_100x200\.webp$/,
    );
    expect(body.imageUrl).toBeDefined();
  });

  it('fileName이 주어지면 uuid 폴더 하위에 원본명을 유지한 키가 생성된다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'commission-work',
        ext: 'webp',
        width: 100,
        height: 200,
        fileName: '내그림.png',
      });

    // then: uuid가 폴더(/)로 들어가고, 원본명(확장자 제거)이 마지막 세그먼트로 유지된다
    expect(status).toBe(200);
    expect(body.imageName).toMatch(
      /^v2\/commission-work\/[a-f0-9\-]{36}\/내그림_100x200\.webp$/,
    );
  });

  it('fileName의 언더스코어(_)는 하이픈(-)으로 치환된다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'commission-work',
        ext: 'webp',
        width: 100,
        height: 200,
        fileName: 'my_photo_v2.jpg',
      });

    // then: 프론트가 _로 WxH를 파싱하므로 원본명 내부 _는 -로 치환된다
    expect(status).toBe(200);
    expect(body.imageName).toMatch(
      /^v2\/commission-work\/[a-f0-9\-]{36}\/my-photo-v2_100x200\.webp$/,
    );
  });

  it('fileName의 공백·경로구분자(/) 등 비안전 문자는 하이픈(-)으로 치환된다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status, body } = await request(app.getHttpServer())
      .post('/images/get-upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'commission-work',
        ext: 'webp',
        width: 100,
        height: 200,
        fileName: 'a b/c.png',
      });

    // then
    expect(status).toBe(200);
    expect(body.imageName).toMatch(
      /^v2\/commission-work\/[a-f0-9\-]{36}\/a-b-c_100x200\.webp$/,
    );
  });
});
