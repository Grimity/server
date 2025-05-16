import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('PUT /albums/order - 앨범 순서 변경', () => {
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
    const { status } = await request(app.getHttpServer())
      .put('/albums/order')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('앨범ID가 UUID 형식이 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ids: ['invalid-id'] });

    // then
    expect(status).toBe(400);
  });

  it('앨범ID는 최소 2개 이상이어야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status, body } = await request(app.getHttpServer())
      .put('/albums/order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ids: ['00000000-0000-0000-0000-000000000001'] });

    // then
    expect(status).toBe(400);
  });

  it('204와 함께 앨범 순서를 변경한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();

    const { id: albumId1 } = await prisma.album.create({
      data: {
        userId: user.id,
        name: 'album1',
        order: 1,
      },
    });
    const { id: albumId2 } = await prisma.album.create({
      data: {
        userId: user.id,
        name: 'album2',
        order: 2,
      },
    });
    const { id: albumId3 } = await prisma.album.create({
      data: {
        userId: user.id,
        name: 'album3',
        order: 3,
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums/order')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ids: [albumId2, albumId3, albumId1] });

    // then
    expect(status).toBe(204);

    const albums = await prisma.album.findMany({
      orderBy: {
        order: 'asc',
      },
    });
    expect(albums[0].name).toBe('album2');
    expect(albums[1].name).toBe('album3');
    expect(albums[2].name).toBe('album1');
  });
});
