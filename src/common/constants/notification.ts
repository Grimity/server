import { subscriptionTypes } from './subscription';

import { ApiProperty } from '@nestjs/swagger';

export const notificationTypes = [
  ...subscriptionTypes,
  'FEED_MENTION',
  'POST_MENTION',
];

export type NotificationType = (typeof notificationTypes)[number];

// TODO: 이게 왜 여기있냐
class Actor {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;
}

export class FollowData {
  @ApiProperty({ enum: ['FOLLOW'] })
  type: 'FOLLOW';

  @ApiProperty({ type: Actor })
  actor: Actor;
}

export class FeedLikeData {
  @ApiProperty({ enum: ['FEED_LIKE'] })
  type: 'FEED_LIKE';

  @ApiProperty()
  feedId: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  thumbnail: string;

  @ApiProperty()
  title: string;
}

export class FeedCommentData {
  @ApiProperty({ enum: ['FEED_COMMENT'] })
  type: 'FEED_COMMENT';

  @ApiProperty()
  feedId: string;

  @ApiProperty({ type: Actor })
  actor: Actor;
}

export class FeedReplyData {
  @ApiProperty({ enum: ['FEED_REPLY'] })
  type: 'FEED_REPLY';

  @ApiProperty()
  feedId: string;

  @ApiProperty({ type: Actor })
  actor: Actor;
}

export class FeedMentionData {
  @ApiProperty({ enum: ['FEED_MENTION'] })
  type: 'FEED_MENTION';

  @ApiProperty()
  feedId: string;

  @ApiProperty({ type: Actor })
  actor: Actor;
}

export class PostCommentData {
  @ApiProperty({ enum: ['POST_COMMENT'] })
  type: 'POST_COMMENT';

  @ApiProperty()
  postId: string;

  @ApiProperty({ type: Actor })
  actor: Actor;
}

export class PostReplyData {
  @ApiProperty({ enum: ['POST_REPLY'] })
  type: 'POST_REPLY';

  @ApiProperty()
  postId: string;

  @ApiProperty({ type: Actor })
  actor: Actor;
}

export class PostMentionData {
  @ApiProperty({ enum: ['POST_MENTION'] })
  type: 'POST_MENTION';

  @ApiProperty()
  postId: string;

  @ApiProperty({ type: Actor })
  actor: Actor;
}

export type NotificationData =
  | typeof FollowData
  | typeof FeedLikeData
  | typeof FeedCommentData
  | typeof FeedReplyData
  | typeof FeedMentionData
  | typeof PostCommentData
  | typeof PostReplyData
  | typeof PostMentionData;
