import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('PATCH /albums/:id - 앨범 수정', () => {
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
      .patch('/albums/1')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('앨범ID가 UUID 형식이 아닐 때 400을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .patch('/albums/invalid-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'test' });

    // then
    expect(status).toBe(400);
  });

  it('앨범 이름은 1자 이상 15자 이하여야 한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status } = await request(app.getHttpServer())
      .patch('/albums/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'a'.repeat(16) });

    // then
    expect(status).toBe(400);
  });

  it('앨범 이름이 중복될 때 409를 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    await prisma.album.create({
      data: {
        userId: user.id,
        name: 'test',
        order: 1,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .patch('/albums/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'test' });

    // then
    expect(status).toBe(409);
  });

  it('앨범을 수정하고 204를 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    const album = await prisma.album.create({
      data: {
        userId: user.id,
        name: 'test',
        order: 1,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .patch(`/albums/${album.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'updated' });

    // then
    expect(status).toBe(204);
    const updatedAlbum = await prisma.album.findFirstOrThrow();
    expect(updatedAlbum.name).toBe('updated');
  });
});
