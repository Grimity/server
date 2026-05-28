import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { createTestUser } from '../helper/create-test-user';

describe('DELETE /me/commission-notice - 내 커미션 공지 삭제', () => {
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
    const { status } = await request(app.getHttpServer())
      .delete('/me/commission-notice')
      .send();

    expect(status).toBe(401);
  });

  it('공지가 있을 때 삭제하고 204를 반환한다', async () => {
    const { user, accessToken } = await createTestUser(app, {});

    await prisma.commissionNotice.create({
      data: { userId: user.id, title: '제목', content: '내용' },
    });

    const { status } = await request(app.getHttpServer())
      .delete('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    expect(status).toBe(204);

    const saved = await prisma.commissionNotice.findUnique({
      where: { userId: user.id },
    });
    expect(saved).toBeNull();
  });

  it('공지가 없어도 204를 반환한다 (idempotent)', async () => {
    const { accessToken } = await createTestUser(app, {});

    const { status } = await request(app.getHttpServer())
      .delete('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    expect(status).toBe(204);
  });

  it('다른 유저의 공지는 삭제되지 않는다', async () => {
    const { user: otherUser } = await createTestUser(app, {
      url: 'other',
      providerId: 'other',
      name: 'other',
      email: 'other@example.com',
    });
    const { accessToken } = await createTestUser(app, {});

    await prisma.commissionNotice.create({
      data: { userId: otherUser.id, title: '다른 유저 제목', content: '내용' },
    });

    const { status } = await request(app.getHttpServer())
      .delete('/me/commission-notice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    expect(status).toBe(204);

    const saved = await prisma.commissionNotice.findUnique({
      where: { userId: otherUser.id },
    });
    expect(saved).not.toBeNull();
  });
});
