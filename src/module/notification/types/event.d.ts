export interface FollowEvent {
  type: 'FOLLOW';
  actorId: string;
  userId: string;
}

export interface FeedLikeEvent {
  type: 'FEED_LIKE';
  feedId: string;
  likeCount: number;
}

export interface FeedCommentEvent {
  type: 'FEED_COMMENT';
  feedId: string;
  actorId: string;
}

export interface FeedReplyEvent {
  type: 'FEED_REPLY';
  feedId: string;
  actorId: string;
  parentId: string;
}

export interface FeedMentionEvent {
  type: 'FEED_MENTION';
  feedId: string;
  actorId: string;
  mentionedUserId: string;
}

export interface PostCommentEvent {
  type: 'POST_COMMENT';
  postId: string;
  actorId: string;
}

export interface PostReplyEvent {
  type: 'POST_REPLY';
  postId: string;
  actorId: string;
  parentId: string;
}

export interface PostMentionEvent {
  type: 'POST_MENTION';
  postId: string;
  actorId: string;
  mentionedUserId: string;
}
