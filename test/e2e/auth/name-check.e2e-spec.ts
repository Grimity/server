import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/provider/auth.service';

describe('POST /auth/register/name - 이름 중복 확인', () => {
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

  it('name이 2글자 미만일때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register/name')
      .send({
        name: 'a',
      });

    // then
    expect(status).toBe(400);
  });

  it('name이 12글자 초과일때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register/name')
      .send({
        name: 'a'.repeat(13),
      });

    // then
    expect(status).toBe(400);
  });

  it('중복이 없으면 204를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register/name')
      .send({
        name: 'aa',
      });

    // then
    expect(status).toBe(204);
  });

  it('중복이면 409를 반환한다', async () => {
    // given
    await prisma.user.create({
      data: {
        name: 'test',
        provider: 'KAKAO',
        providerId: 'test',
        email: 'test@test.com',
        url: 'test',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .post('/auth/register/name')
      .send({
        name: 'test',
      });

    // then
    expect(status).toBe(409);
  });
});
