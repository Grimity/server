import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type * as Event from './types/event';
import { ConfigService } from '@nestjs/config';
import { getImageUrl } from 'src/shared/util/get-image-url';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { kyselyUuid } from 'src/shared/util/convert-uuid';

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
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('notification.FOLLOW')
  async handleFollowEvent({ actorId, userId }: Event.FollowEvent) {
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

    await this.prisma.notification.create({
      data: {
        userId,
        image: getImageUrl(actor.image),
        link: getProfileLink(actor.url),
        message: `${actor.name}님이 나를 팔로우했어요`,
      },
    });
  }

  @OnEvent('notification.FEED_LIKE')
  async handleFeedLikeEvent({ feedId, likeCount }: Event.FeedLikeEvent) {
    const [result] = await this.prisma.$kysely
      .selectFrom('Feed')
      .innerJoin('User', 'Feed.authorId', 'User.id')
      .where('Feed.id', '=', kyselyUuid(feedId))
      .select(['User.subscription', 'Feed.authorId', 'thumbnail', 'title'])
      .execute();

    if (!result || !result.subscription.includes('FEED_LIKE')) return;

    await this.prisma.notification.create({
      data: {
        userId: result.authorId,
        image: getImageUrl(result.thumbnail),
        link: getFeedLink(feedId),
        message: `${result.title}에 좋아요가 ${likeCount}개 달렸어요`,
      },
    });
  }

  @OnEvent('notification.FEED_COMMENT')
  async handleFeedComment({ feedId, actorId }: Event.FeedCommentEvent) {
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

    await this.prisma.notification.create({
      data: {
        userId: result.authorId,
        image: getImageUrl(actor.image),
        link: getFeedLink(feedId),
        message: `${actor.name}님이 내 그림에 댓글을 남겼어요`,
      },
    });
  }

  @OnEvent('notification.FEED_REPLY')
  async handleFeedReply({ feedId, actorId, parentId }: Event.FeedReplyEvent) {
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

    await this.prisma.notification.create({
      data: {
        userId: result.writerId,
        image: getImageUrl(actor.image),
        link: getFeedLink(feedId),
        message: `${actor.name}님이 내 댓글에 답글을 달았어요`,
      },
    });
  }

  @OnEvent('notification.FEED_MENTION')
  async handleFeedMention({
    feedId,
    actorId,
    mentionedUserId,
  }: Event.FeedMentionEvent) {
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

    await this.prisma.notification.create({
      data: {
        userId: mentionedUserId,
        image: getImageUrl(actor.image),
        link: getFeedLink(feedId),
        message: `${actor.name}님이 내 댓글에 답글을 달았어요`,
      },
    });
  }

  @OnEvent('notification.POST_COMMENT')
  async handlePostComment({ postId, actorId }: Event.PostCommentEvent) {
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

    await this.prisma.notification.create({
      data: {
        userId: author.authorId,
        image: getImageUrl(actor.image),
        link: getPostLink(postId),
        message: `${actor.name}님이 내 게시글에 댓글을 달았어요`,
      },
    });
  }

  @OnEvent('notification.POST_REPLY')
  async handlePostReply({ postId, actorId, parentId }: Event.PostReplyEvent) {
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
      !result.subscription.includes('POST_COMMENT')
    )
      return;

    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true, image: true },
    });
    if (!actor) return;

    await this.prisma.notification.create({
      data: {
        userId: result.writerId,
        image: getImageUrl(actor.image),
        link: getPostLink(postId),
        message: `${actor.name}님이 내 댓글에 답글을 달았어요`,
      },
    });
  }

  @OnEvent('notification.POST_MENTION')
  async handlePostMention({
    postId,
    actorId,
    mentionedUserId,
  }: Event.PostMentionEvent) {
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

    await this.prisma.notification.create({
      data: {
        userId: mentionedUserId,
        image: getImageUrl(actor.image),
        link: getPostLink(postId),
        message: `${actor.name}님이 내 댓글에 답글을 달았어요`,
      },
    });
  }
}
