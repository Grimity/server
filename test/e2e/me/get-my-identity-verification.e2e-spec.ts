import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('GET /me/identity-verification - 내 본인인증 상태 조회', () => {
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
      .get('/me/identity-verification')
      .send();

    // then
    expect(status).toBe(401);
  });

  it('인증 레코드가 없을 때 isVerified=false와 null 필드들을 반환한다', async () => {
    // given
    const { accessToken } = await createTestUser(app, {});

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/identity-verification')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      isVerified: false,
      name: null,
      birthDate: null,
    });
  });

  it('인증 레코드가 있을 때 isVerified=true와 실명·생년월일을 반환한다', async () => {
    // given
    const { accessToken, user } = await createTestUser(app, {});

    await prisma.identityVerification.create({
      data: {
        userId: user.id,
        identityVerificationId: 'identity-verification-test-1',
        ci: 'ci-test-1',
        name: '임종훈',
        phoneNumber: '01012345678',
        birthDate: new Date('2000-01-14'),
        gender: 'MALE',
        isForeigner: false,
        pgProvider: 'INICIS_UNIFIED',
        pgTxId: 'pg-tx-test-1',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/identity-verification')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      isVerified: true,
      name: '임종훈',
      birthDate: '2000-01-14',
    });
  });

  it('다른 유저의 인증 레코드는 노출되지 않는다', async () => {
    // given
    const { user: otherUser } = await createTestUser(app, {
      url: 'other',
      providerId: 'other',
      name: 'other',
      email: 'other@example.com',
    });
    const { accessToken } = await createTestUser(app, {});

    await prisma.identityVerification.create({
      data: {
        userId: otherUser.id,
        identityVerificationId: 'identity-verification-test-2',
        ci: 'ci-test-2',
        name: '다른사람',
        phoneNumber: '01099998888',
        birthDate: new Date('1995-06-15'),
        gender: 'FEMALE',
        isForeigner: false,
        pgProvider: 'INICIS_UNIFIED',
        pgTxId: 'pg-tx-test-2',
      },
    });

    // when
    const { status, body } = await request(app.getHttpServer())
      .get('/me/identity-verification')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    // then
    expect(status).toBe(200);
    expect(body).toEqual({
      isVerified: false,
      name: null,
      birthDate: null,
    });
  });
});
