import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /me/image', () => {
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
      .delete('/me/image')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 프로필 이미지를 삭제한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {
      image: 'profile/test.jpg',
    });

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/me/image')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.image).toBeNull();
  });
});
