import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { register } from '../helper/register';
import { sampleUuid } from '../helper/sample-uuid';

describe('POST /chat-messages - 채팅메시지 생성', () => {
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
      .post('/chat-messages')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('chatId가 UUID가 아니면 400을 반환한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: 'invalid',
        content: 'test',
        images: [],
      });

    // then
    expect(status).toBe(400);
  });

  it('images가 있다면 chat/ prefix를 가져야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: sampleUuid,
        images: ['invalid'],
      });

    // then
    expect(status).toBe(400);
  });

  it('replyToId가 있다면 UUID 여야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: sampleUuid,
        images: [],
        content: 'test',
        replyToId: 'invalid',
      });

    // then
    expect(status).toBe(400);
  });

  it('content나 images 둘 중 하나는 반드시 있어야 한다', async () => {
    // given
    const accessToken = await register(app, 'test');

    // when
    const { status } = await request(app.getHttpServer())
      .post('/chat-messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        chatId: sampleUuid,
        images: [],
      });

    // then
    expect(status).toBe(400);
  });
});
