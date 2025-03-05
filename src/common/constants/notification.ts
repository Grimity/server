import { subscriptionTypes } from './subscription';

import { ApiProperty } from '@nestjs/swagger';

export const notificationTypes = [
  ...subscriptionTypes,
  'FEED_MENTION',
  'POST_MENTION',
];

export type NotificationType = (typeof notificationTypes)[number];

interface Actor {
  id: string;
  name: string;
  image: string | null;
}

export interface FollowData {
  type: 'FOLLOW';
  actor: Actor;
}

export interface FeedLikeData {
  type: 'FEED_LIKE';
  feedId: string;
  likeCount: number;
  thumbnail: string;
  title: string;
}

export interface FeedCommentData {
  type: 'FEED_COMMENT';
  feedId: string;
  actor: Actor;
}

export interface FeedReplyData {
  type: 'FEED_REPLY';
  feedId: string;
  actor: Actor;
}

export interface FeedMentionData {
  type: 'FEED_MENTION';
  feedId: string;
  actor: Actor;
}

export interface PostCommentData {
  type: 'POST_COMMENT';
  postId: string;
  actor: Actor;
}

export interface PostReplyData {
  type: 'POST_REPLY';
  postId: string;
  actor: Actor;
}

export interface PostMentionData {
  type: 'POST_MENTION';
  postId: string;
  actor: Actor;
}

export type NotificationData =
  | FollowData
  | FeedLikeData
  | FeedCommentData
  | FeedReplyData
  | FeedMentionData
  | PostCommentData
  | PostReplyData
  | PostMentionData;
