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

  describe('FEED_COMMENT 이벤트', () => {
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
            provider: 'kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            image: 'test2',
            email: 'test2@test.com',
            subscription: ['FEED_COMMENT'],
          },
        ],
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedComment({
        feedId: feed.id,
        actorId: actor.id,
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
        message: `${actor.name}님이 내 그림에 댓글을 남겼어요`,
        image: `${process.env.IMAGE_URL}/${actor.image}`,
      });
    });

    it('유저가 구독하지 않았을 때 알림 데이터를 생성하지 않는다', async () => {
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
            provider: 'kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            image: 'test2',
            email: 'test2@test.com',
            subscription: [],
          },
        ],
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedComment({
        feedId: feed.id,
        actorId: actor.id,
      });

      // then
      const notification = await prisma.notification.findFirst({
        where: { userId: targetUser.id },
      });

      expect(notification).toBeNull();
    });

    it('피드 작성자와 댓글 작성자가 같을 경우 알림을 보내지 않는다', async () => {
      // given
      const user = await prisma.user.create({
        data: {
          provider: 'kakao',
          providerId: 'test1',
          url: 'test1',
          name: 'test1',
          image: 'test1',
          email: 'test1@test.com',
        },
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: user.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedComment({
        feedId: feed.id,
        actorId: user.id,
      });

      // then
      const notification = await prisma.notification.findFirst({
        where: { userId: user.id },
      });

      expect(notification).toBeNull();
    });
  });

  describe('FEED_REPLY 이벤트', () => {
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
            provider: 'kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            image: 'test2',
            email: 'test2@test.com',
            subscription: ['FEED_REPLY'],
          },
        ],
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      const parentComment = await prisma.feedComment.create({
        data: {
          feedId: feed.id,
          writerId: targetUser.id,
          content: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedReply({
        feedId: feed.id,
        actorId: actor.id,
        parentId: parentComment.id,
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
        message: `${actor.name}님이 내 댓글에 답글을 남겼어요`,
        image: `${process.env.IMAGE_URL}/${actor.image}`,
      });
    });

    it('유저가 구독하지 않았을 때 알림 데이터를 생성하지 않는다', async () => {
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
            provider: 'kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            image: 'test2',
            email: 'test2@test.com',
            subscription: [],
          },
        ],
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      const parentComment = await prisma.feedComment.create({
        data: {
          feedId: feed.id,
          writerId: targetUser.id,
          content: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedReply({
        feedId: feed.id,
        actorId: actor.id,
        parentId: parentComment.id,
      });

      // then
      const notification = await prisma.notification.findFirst({
        where: { userId: targetUser.id },
      });

      expect(notification).toBeNull();
    });

    it('부모 댓글 작성자와 대댓글 작성자가 같을 경우 알림을 보내지 않는다', async () => {
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
            provider: 'kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            image: 'test2',
            email: 'test2@test.com',
            subscription: ['FEED_REPLY'],
          },
        ],
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      const parentComment = await prisma.feedComment.create({
        data: {
          feedId: feed.id,
          writerId: targetUser.id,
          content: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedReply({
        feedId: feed.id,
        actorId: targetUser.id,
        parentId: parentComment.id,
      });

      // then
      const notification = await prisma.notification.findFirst({
        where: { userId: targetUser.id },
      });

      expect(notification).toBeNull();
    });
  });

  describe('FEED_MENTION 이벤트', () => {
    it('피드 멘션 알림을 생성한다', async () => {
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
            provider: 'kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            image: 'test2',
            email: 'test2@test.com',
            subscription: ['FEED_REPLY'],
          },
        ],
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedMention({
        feedId: feed.id,
        actorId: actor.id,
        mentionedUserId: targetUser.id,
      });

      // then
      const notification = await prisma.notification.findFirst({
        where: { userId: targetUser.id },
      });

      expect(notification).toEqual({
        id: expect.any(String),
        userId: targetUser.id,
        isRead: false,
        createdAt: expect.any(Date),
        link: `${process.env.SERVICE_URL}/feeds/${feed.id}`,
        message: `${actor.name}님이 내 댓글에 답글을 남겼어요`,
        image: `${process.env.IMAGE_URL}/${actor.image}`,
      });
    });

    it('구독하지 않았을 경우 알림을 생성하지 않는다', async () => {
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
            provider: 'kakao',
            providerId: 'test2',
            url: 'test2',
            name: 'test2',
            image: 'test2',
            email: 'test2@test.com',
            subscription: [],
          },
        ],
      });

      const feed = await prisma.feed.create({
        data: {
          authorId: targetUser.id,
          title: 'test1',
          thumbnail: 'test1',
        },
      });

      // when
      await notificationListener.handleFeedMention({
        feedId: feed.id,
        actorId: actor.id,
        mentionedUserId: targetUser.id,
      });

      // then
      const notification = await prisma.notification.findFirst({
        where: { userId: targetUser.id },
      });

      expect(notification).toBeNull();
    });
  });
});
