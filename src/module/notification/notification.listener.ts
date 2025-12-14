import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { kyselyUuid } from 'src/shared/util/convert-uuid';
import { GlobalGateway } from '../websocket/global.gateway';
import { RedisService } from 'src/database/redis/redis.service';
import { PushService } from '../push/push.service';
import { EventPayloadMap } from 'src/infrastructure/event/event-payload.types';

function getProfileLink(url: string) {
  return `${process.env.SERVICE_URL}/${url}`;
}

function getFeedLink(id: string) {
  return `${process.env.SERVICE_URL}/feeds/${id}`;
}

function getPostLink(id: string) {
  return `${process.env.SERVICE_URL}/posts/${id}`;
}

@Injectable()
export class NotificationListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly globalGateway: GlobalGateway,
    private readonly redisService: RedisService,
    private readonly pushService: PushService,
  ) {}

  @OnEvent('notification:FOLLOW')
  async handleFollowEvent({
    actorId,
    userId,
  }: EventPayloadMap['notification:FOLLOW']) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: true },
    });
    if (!user || !user.subscription.includes('FOLLOW')) return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { image: true, url: true, name: true },
    });
    if (!actor) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        image: getImageUrl(actor.image),
        link: getProfileLink(actor.url),
        message: `${actor.name}님이 나를 팔로우했어요`,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
    });

    const isSubscribed = await this.redisService.isSubscribed(`user:${userId}`);

    if (isSubscribed) {
      this.globalGateway.emitNewNotificationToUser(userId, notification);
    }

    await this.pushService.pushNotification({
      userId,
      title: `${actor.name}`,
      text: `${actor.name}님이 나를 팔로우했어요!`,
      imageUrl: getImageUrl(actor.image),
      data: {
        event: 'newNotification',
        deepLink: `/profile/${actor.url}`,
        data: JSON.stringify(notification),
      },
      silent: false,
      key: `follow-${actorId}`,
    });
  }

  @OnEvent('notification:FEED_LIKE')
  async handleFeedLikeEvent({
    feedId,
    likeCount,
  }: EventPayloadMap['notification:FEED_LIKE']) {
    const [result] = await this.prisma.$kysely
      .selectFrom('Feed')
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .where('Feed.id', '=', kyselyUuid(feedId))
      .select(['User.subscription', 'Feed.authorId', 'thumbnail', 'title'])
      .execute();

    if (!result || !result.subscription.includes('FEED_LIKE')) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: result.authorId,
        image: getImageUrl(result.thumbnail),
        link: getFeedLink(feedId),
        message: `${result.title}에 좋아요가 ${likeCount}개 달렸어요`,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
    });

    const isSubscribed = await this.redisService.isSubscribed(
      `user:${result.authorId}`,
    );

    if (isSubscribed)
      this.globalGateway.emitNewNotificationToUser(
        result.authorId,
        notification,
      );

    await this.pushService.pushNotification({
      userId: result.authorId,
      title: `${result.title}`,
      text: `내 그림에 좋아요가 ${likeCount}개 달렸어요!`,
      imageUrl: getImageUrl(result.thumbnail),
      data: {
        event: 'newNotification',
        deepLink: `/feeds/${feedId}`,
        data: JSON.stringify(notification),
      },
      silent: false,
      key: `feed-like-${feedId}`,
    });
  }

  @OnEvent('notification:FEED_COMMENT')
  async handleFeedComment({
    feedId,
    actorId,
  }: EventPayloadMap['notification:FEED_COMMENT']) {
    const [result] = await this.prisma.$kysely
      .selectFrom('Feed')
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .where('Feed.id', '=', kyselyUuid(feedId))
      .select(['User.subscription', 'Feed.authorId', 'thumbnail', 'title'])
      .execute();
    if (
      !result ||
      result.authorId === actorId ||
      !result.subscription.includes('FEED_COMMENT')
    )
      return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { image: true, name: true },
    });
    if (!actor) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: result.authorId,
        image: getImageUrl(actor.image),
        link: getFeedLink(feedId),
        message: `${actor.name}님이 내 그림에 댓글을 남겼어요`,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
    });

    const isSubscribed = await this.redisService.isSubscribed(
      `user:${result.authorId}`,
    );

    if (isSubscribed)
      this.globalGateway.emitNewNotificationToUser(
        result.authorId,
        notification,
      );

    await this.pushService.pushNotification({
      userId: result.authorId,
      title: `${result.title}`,
      text: `${actor.name}님이 내 그림에 댓글을 남겼어요!`,
      imageUrl: getImageUrl(actor.image),
      data: {
        event: 'newNotification',
        deepLink: `/feeds/${feedId}`,
        data: JSON.stringify(notification),
      },
      silent: false,
      key: `feed-comment-${feedId}`,
    });
  }

  @OnEvent('notification:FEED_REPLY')
  async handleFeedReply({
    feedId,
    actorId,
    parentId,
  }: EventPayloadMap['notification:FEED_REPLY']) {
    const [result] = await this.prisma.$kysely
      .selectFrom('FeedComment')
      .innerJoin('User', 'FeedComment.writerId', 'User.id')
      .where('FeedComment.id', '=', kyselyUuid(parentId))
      .select(['User.subscription', 'FeedComment.writerId'])
      .execute();

    if (
      !result ||
      result.writerId === actorId ||
      !result.subscription.includes('FEED_REPLY')
    )
      return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true, image: true },
    });
    if (!actor) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: result.writerId,
        image: getImageUrl(actor.image),
        link: getFeedLink(feedId),
        message: `${actor.name}님이 내 댓글에 답글을 남겼어요`,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
    });

    const isSubscribed = await this.redisService.isSubscribed(
      `user:${result.writerId}`,
    );

    if (isSubscribed)
      this.globalGateway.emitNewNotificationToUser(
        result.writerId,
        notification,
      );

    await this.pushService.pushNotification({
      userId: result.writerId,
      title: `${actor.name}`,
      text: `${actor.name}님이 내 댓글에 답글을 남겼어요!`,
      imageUrl: getImageUrl(actor.image),
      data: {
        event: 'newNotification',
        deepLink: `/feeds/${feedId}`,
        data: JSON.stringify(notification),
      },
      silent: false,
      key: `feed-reply-${parentId}`,
    });
  }

  @OnEvent('notification:FEED_MENTION')
  async handleFeedMention({
    feedId,
    actorId,
    mentionedUserId,
  }: EventPayloadMap['notification:FEED_MENTION']) {
    const mentionedUser = await this.prisma.user.findUnique({
      where: { id: mentionedUserId },
      select: { id: true, subscription: true },
    });

    if (!mentionedUser || !mentionedUser.subscription.includes('FEED_REPLY'))
      return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true, image: true },
    });
    if (!actor) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: mentionedUserId,
        image: getImageUrl(actor.image),
        link: getFeedLink(feedId),
        message: `${actor.name}님이 내 댓글에 답글을 남겼어요`,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
    });

    const isSubscribed = await this.redisService.isSubscribed(
      `user:${mentionedUserId}`,
    );

    if (isSubscribed)
      this.globalGateway.emitNewNotificationToUser(
        mentionedUserId,
        notification,
      );

    await this.pushService.pushNotification({
      userId: mentionedUserId,
      title: `${actor.name}`,
      text: `${actor.name}님이 내 댓글에 답글을 남겼어요!`,
      imageUrl: getImageUrl(actor.image),
      data: {
        event: 'newNotification',
        deepLink: `/feeds/${feedId}`,
        data: JSON.stringify(notification),
      },
      silent: false,
      key: `feed-mention-${feedId}`,
    });
  }

  @OnEvent('notification:POST_COMMENT')
  async handlePostComment({
    postId,
    actorId,
  }: EventPayloadMap['notification:POST_COMMENT']) {
    const [author] = await this.prisma.$kysely
      .selectFrom('Post')
      .innerJoin('User', 'Post.authorId', 'User.id')
      .where('Post.id', '=', kyselyUuid(postId))
      .select(['Post.authorId', 'User.subscription'])
      .execute();

    if (
      !author ||
      author.authorId === actorId ||
      !author.subscription.includes('POST_COMMENT')
    )
      return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true, image: true },
    });
    if (!actor) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: author.authorId,
        image: getImageUrl(actor.image),
        link: getPostLink(postId),
        message: `${actor.name}님이 내 게시글에 댓글을 남겼어요`,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
    });

    const isSubscribed = await this.redisService.isSubscribed(
      `user:${author.authorId}`,
    );

    if (isSubscribed)
      this.globalGateway.emitNewNotificationToUser(
        author.authorId,
        notification,
      );

    await this.pushService.pushNotification({
      userId: author.authorId,
      title: `${actor.name}`,
      text: `${actor.name}님이 내 게시글에 댓글을 남겼어요!`,
      imageUrl: getImageUrl(actor.image),
      data: {
        event: 'newNotification',
        deepLink: `/posts/${postId}`,
        data: JSON.stringify(notification),
      },
      silent: false,
      key: `post-comment-${postId}`,
    });
  }

  @OnEvent('notification:POST_REPLY')
  async handlePostReply({
    postId,
    actorId,
    parentId,
  }: EventPayloadMap['notification:POST_REPLY']) {
    const [result] = await this.prisma.$kysely
      .selectFrom('PostComment')
      .innerJoin('User', 'PostComment.writerId', 'User.id')
      .where('PostComment.id', '=', kyselyUuid(parentId))
      .select([
        'PostComment.isDeleted',
        'User.subscription',
        'PostComment.writerId',
      ])
      .execute();

    if (
      !result?.writerId ||
      result.writerId === actorId ||
      result.isDeleted === true ||
      !result.subscription.includes('POST_REPLY')
    )
      return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true, image: true },
    });
    if (!actor) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: result.writerId,
        image: getImageUrl(actor.image),
        link: getPostLink(postId),
        message: `${actor.name}님이 내 댓글에 답글을 남겼어요`,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
    });

    const isSubscribed = await this.redisService.isSubscribed(
      `user:${result.writerId}`,
    );

    if (isSubscribed)
      this.globalGateway.emitNewNotificationToUser(
        result.writerId,
        notification,
      );

    await this.pushService.pushNotification({
      userId: result.writerId,
      title: `${actor.name}`,
      text: `${actor.name}님이 내 댓글에 답글을 남겼어요!`,
      imageUrl: getImageUrl(actor.image),
      data: {
        event: 'newNotification',
        deepLink: `/posts/${postId}`,
        data: JSON.stringify(notification),
      },
      silent: false,
      key: `post-reply-${parentId}`,
    });
  }

  @OnEvent('notification:POST_MENTION')
  async handlePostMention({
    postId,
    actorId,
    mentionedUserId,
  }: EventPayloadMap['notification:POST_MENTION']) {
    if (actorId === mentionedUserId) return;

    const mentionedUser = await this.prisma.user.findUnique({
      where: { id: mentionedUserId },
      select: { subscription: true },
    });

    if (!mentionedUser || !mentionedUser.subscription.includes('POST_REPLY'))
      return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true, image: true },
    });
    if (!actor) return;

    const notification = await this.prisma.notification.create({
      data: {
        userId: mentionedUserId,
        image: getImageUrl(actor.image),
        link: getPostLink(postId),
        message: `${actor.name}님이 내 댓글에 답글을 남겼어요`,
      },
      select: {
        id: true,
        isRead: true,
        createdAt: true,
        link: true,
        image: true,
        message: true,
      },
    });

    const isSubscribed = await this.redisService.isSubscribed(
      `user:${mentionedUserId}`,
    );

    if (isSubscribed)
      this.globalGateway.emitNewNotificationToUser(
        mentionedUserId,
        notification,
      );

    await this.pushService.pushNotification({
      userId: mentionedUserId,
      title: `${actor.name}`,
      text: `${actor.name}님이 내 댓글에 답글을 남겼어요!`,
      imageUrl: getImageUrl(actor.image),
      data: {
        event: 'newNotification',
        deepLink: `/posts/${postId}`,
        data: JSON.stringify(notification),
      },
      silent: false,
      key: `post-mention-${postId}`,
    });
  }
}
