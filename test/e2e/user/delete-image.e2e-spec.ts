import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('DELETE /users/me/image', () => {
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
    const { status } = await request(app.getHttpServer())
      .delete('/users/me/image')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 프로필 이미지를 삭제한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });

    await prisma.user.updateMany({
      data: {
        image: 'profile/test.jpg',
      },
    });

    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .delete('/users/me/image')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.image).toBeNull();

    // cleanup
    spy.mockRestore();
  });
});
