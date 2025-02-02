import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/provider/prisma.service';

describe('GET /tags/search - 태그 여러개로 검색', () => {
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

  it('태그가 없으면 400 에러를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get('/tags/search');

    // then
    expect(status).toBe(400);
  });

  it('태그가 10개 초과하면 400 에러를 반환한다', async () => {
    // when
    const { status } = await request(app.getHttpServer()).get(
      '/tags/search?tagNames=1,2,3,4,5,6,7,8,9,10,11',
    );

    // then
    expect(status).toBe(400);
  });

  it('200과 함께 피드를 반환한다', async () => {
    // given
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'test',
        name: 'test',
        email: 'test@test.com',
      },
    });

    for (let i = 0; i < 15; i++) {
      await prisma.feed.create({
        data: {
          title: `test${i}`,
          thumbnail: `test${i}.jpg`,
          content: 'test',
          authorId: user.id,
          tags: {
            create: [
              {
                tagName: `test${i}`,
              },
              {
                tagName: '이건많음',
              },
            ],
          },
        },
      });
    }

    // when
    const { status, body } = await request(app.getHttpServer()).get(
      '/tags/search?tagNames=test0,test2',
    );

    // then
    expect(status).toBe(200);
    expect(body).toHaveLength(2);
  });
});
