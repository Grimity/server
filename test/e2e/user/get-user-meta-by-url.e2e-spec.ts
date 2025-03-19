import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('GET /users/profile/:url/meta - url로 유저 메타데이터 조회', () => {
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

  it('존재하지 않는 유저는 404를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get(
      `/users/profile/not/meta`,
    );

    // then
    expect(status).toBe(404);
  });

  it('200과 함께 유저 메타데이터를 조회한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        email: 'test@test.com',
        name: 'test',
        url: 'test',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      `/users/profile/${user.url}/meta`,
    );

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      id: user.id,
      name: 'test',
      description: '',
      image: null,
      url: 'test',
    });
  });
});
