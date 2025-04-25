import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /albums - 앨범 수정', () => {
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
    const { status } = await request(app.getHttpServer()).put('/albums').send();

    // then
    expect(status).toBe(401);
  });

  it('앨범 ID가 UUID 형식이 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        albums: [
          {
            id: 'invalid-uuid',
            name: 'test',
          },
        ],
      });

    // then
    expect(status).toBe(400);
  });

  it('앨범의 개수가 11개 이상일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .put('/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        albums: Array.from({ length: 11 }, (_, i) => ({
          name: `test-${i}`,
        })),
      });

    // then
    expect(status).toBe(400);
  });

  it('앨범 이름이 1글자 미만일 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status, body } = await request(app.getHttpServer())
      .put('/albums')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        albums: [
          {
            name: ' ',
          },
        ],
      });

    // then
    expect(status).toBe(400);
  });
});
