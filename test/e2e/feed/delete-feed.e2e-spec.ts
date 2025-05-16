import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper';

describe('DELETE /feeds/:id - 피드 삭제', () => {
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
      .delete('/feeds/00000000-0000-0000-0000-000000000000')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('feedId가 UUID가 아닐 때 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feeds/1')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(400);
  });

  it('없는 피드를 삭제할때 404를 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/feeds/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(404);
  });

  it('204와 함께 feed를 삭제한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    const user = await prisma.user.findFirstOrThrow();
    const feed = await prisma.feed.create({
      data: {
        authorId: user.id,
        title: 'test',
        content: 'test',
        cards: ['feed/test.jpg'],
        thumbnail: 'test',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete(`/feeds/${feed.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // then
    expect(status).toBe(204);
    const afterFeed = await prisma.feed.findFirst();
    expect(afterFeed).toBeNull();
  });
});
