import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NotificationListener } from 'src/module/notification/notification.listener';
import { PrismaModule } from 'src/database/prisma/prisma.module';
import { PrismaService } from 'src/database/prisma/prisma.service';

describe('NotificationListener', () => {
  let prisma: PrismaService;
  let notificationListener: NotificationListener;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [NotificationListener],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    notificationListener =
      module.get<NotificationListener>(NotificationListener);

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('FOLLOW 이벤트', () => {
    it('유저가 구독했을 때 알림 데이터를 생성한다', async () => {
      // given
      const [actor, targetUser] = await prisma.user.createManyAndReturn({
        data: [
          {
            provider: 'kakao',
            providerId: 'test1',
            url: 'test1',
            name: 'test1',
            image: 'test1',
            email: 'test1@test.com',
          },
          {
            provider: ' kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            email: 'test2@test.com',
            subscription: ['FOLLOW'],
          },
        ],
      });

      // when
      await notificationListener.handleFollowEvent({
        actorId: actor.id,
        userId: targetUser.id,
      });

      // then
      const notification = await prisma.notification.findFirstOrThrow({
        where: { userId: targetUser.id },
      });
      expect(notification).toEqual({
        id: expect.any(String),
        userId: targetUser.id,
        isRead: false,
        createdAt: expect.any(Date),
        link: `${process.env.SERVICE_URL}/${actor.url}`,
        message: `${actor.name}님이 나를 팔로우했어요`,
        image: `${process.env.IMAGE_URL}/${actor.image}`,
      });
    });

    it('유저가 구독하지않았을 땐 알림 데이터를 생성하지 않는다', async () => {
      // given
      const [actor, targetUser] = await prisma.user.createManyAndReturn({
        data: [
          {
            provider: 'kakao',
            providerId: 'test1',
            url: 'test1',
            name: 'test1',
            email: 'test1@test.com',
          },
          {
            provider: ' kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            email: 'test2@test.com',
            subscription: [],
          },
        ],
      });

      // when
      await notificationListener.handleFollowEvent({
        actorId: actor.id,
        userId: targetUser.id,
      });

      // then
      const notification = await prisma.notification.findFirst({
        where: { userId: targetUser.id },
      });
      expect(notification).toBeNull();
    });
  });

  describe('FEED_LIKE 이벤트', () => {
    it('유저가 구독했을 때 알림 데이터를 생성한다', async () => {
      // given
      const targetUser = await prisma.user.create({
        data: {
          provider: 'kakao',
          providerId: 'test1',
          url: 'test1',
          name: 'test1',
          image: 'test1',
          email: 'test1@test.com',
          subscription: ['FEED_LIKE'],
        },
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedLikeEvent({
        feedId: feed.id,
        likeCount: 5,
      });

      // then
      const notification = await prisma.notification.findFirstOrThrow({
        where: { userId: targetUser.id },
      });

      expect(notification).toEqual({
        id: expect.any(String),
        userId: targetUser.id,
        isRead: false,
        createdAt: expect.any(Date),
        link: `${process.env.SERVICE_URL}/feeds/${feed.id}`,
        message: `${feed.title}에 좋아요가 5개 달렸어요`,
        image: `${process.env.IMAGE_URL}/${feed.thumbnail}`,
      });
    });

    it('유저가 구독하지 않았을 때 알림 데이터를 생성하지 않는다', async () => {
      // given
      const targetUser = await prisma.user.create({
        data: {
          provider: 'kakao',
          providerId: 'test1',
          url: 'test1',
          name: 'test1',
          image: 'test1',
          email: 'test1@test.com',
          subscription: [],
        },
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedLikeEvent({
        feedId: feed.id,
        likeCount: 5,
      });

      // then
      const notification = await prisma.notification.findFirst({
        where: { userId: targetUser.id },
      });

      expect(notification).toBeNull();
    });
  });
});
