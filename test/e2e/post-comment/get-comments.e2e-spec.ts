import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';

describe('GET /post-comments?postId={postId} - 게시판 댓글 조회', () => {
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

  it('postId가 UUID가 아닐 때 400을 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get(
      '/post-comments?postId=1',
    );

    // then
    expect(status).toBe(400);
  });
});
