import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';
import { AuthService } from 'src/provider/auth.service';
import { UserService } from 'src/provider/user.service';
import { register } from '../helper';

describe('GET /users/search - 유저 검색', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let userService: UserService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);

    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  it('200과 함께 유저를 검색한다', async () => {
    // given
    const spy = jest.spyOn(authService, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'test',
      email: 'test@test.com',
    });
    const accessToken = await register(app, 'test');

    const me = await prisma.user.findFirstOrThrow();
    const users = await prisma.user.createManyAndReturn({
      data: [
        {
          provider: 'KAKAO',
          providerId: 'test1',
          email: 'test@test.com',
          name: 'test1',
        },
        {
          provider: 'KAKAO',
          providerId: 'test2',
          email: 'test@test.com',
          name: 'test2',
        },
        {
          provider: 'KAKAO',
          providerId: 'test3',
          email: 'test@test.com',
          name: 'test3',
        },
        {
          provider: 'KAKAO',
          providerId: 'test4',
          email: 'test@test.com',
          name: 'test4',
        },
      ],
    });

    await Promise.all([
      userService.follow(users[2].id, users[0].id),
      userService.follow(users[2].id, users[1].id),
      userService.follow(users[1].id, users[0].id),
      userService.follow(me.id, users[0].id),
    ]);

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/users/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ name: 'es', size: 3 });

    const { status: status2, body: body2 } = await request(app.getHttpServer())
      .get('/users/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ name: 'es', size: 3, cursor: body.nextCursor });

    // then
    expect(status).toBe(200);
    expect(body.users).toHaveLength(3);
    expect(body.nextCursor).toBeDefined();
    expect(body.users[0]).toEqual({
      id: users[0].id,
      name: users[0].name,
      description: users[0].description,
      image: users[0].image,
      backgroundImage: users[0].backgroundImage,
      followerCount: 3,
      isFollowing: true,
    });

    expect(status2).toBe(200);
    expect(body2.users).toHaveLength(2);
    expect(body2.nextCursor).toBeNull();

    // cleanup
    spy.mockRestore();
  });
});
