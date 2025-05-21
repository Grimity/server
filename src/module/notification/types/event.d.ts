export interface FollowEvent {
  actorId: string;
  userId: string;
}

export interface FeedLikeEvent {
  feedId: string;
  likeCount: number;
}

export interface FeedCommentEvent {
  feedId: string;
  actorId: string;
}

export interface FeedReplyEvent {
  feedId: string;
  actorId: string;
  parentId: string;
}

export interface FeedMentionEvent {
  feedId: string;
  actorId: string;
  mentionedUserId: string;
}

export interface PostCommentEvent {
  postId: string;
  actorId: string;
}

export interface PostReplyEvent {
  postId: string;
  actorId: string;
  parentId: string;
}

export interface PostMentionEvent {
  postId: string;
  actorId: string;
  mentionedUserId: string;
}
