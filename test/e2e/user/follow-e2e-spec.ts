import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { register } from '../helper';

describe('PUT /users/follow/:targetId', () => {
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
      .put('/users/follow/test')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('204와 함께 팔로우한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    const targetUser = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        email: 'test@test.com',
        name: 'test2',
      },
    });

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/users/follow/${targetUser.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);

    const follow = await prisma.follow.findFirstOrThrow();

    expect(follow.followingId).toBe(targetUser.id);

    // cleanup
    spy.mockRestore();
  });

  it('두번 팔로우해도 204를 반환한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    const targetUser = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test2',
        email: 'test@test.com',
        name: 'test2',
      },
    });

    await request(app.getHttpServer())
      .put(`/users/follow/${targetUser.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // when
    const { status } = await request(app.getHttpServer())
      .put(`/users/follow/${targetUser.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(204);

    const follow = await prisma.follow.findFirstOrThrow();

    expect(follow.followingId).toBe(targetUser.id);

    // cleanup
    spy.mockRestore();
  });
});
