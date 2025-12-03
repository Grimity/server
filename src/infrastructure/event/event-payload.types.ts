export interface EventPayloadMap {
  'notification:FEED_LIKE': { feedId: string; likeCount: number };
  'notification:FEED_MENTION': {
    actorId: string;
    feedId: string;
    mentionedUserId: string;
  };
  'notification:FEED_REPLY': {
    actorId: string;
    feedId: string;
    parentId: string;
  };
  'notification:FEED_COMMENT': { actorId: string; feedId: string };

  'notification:POST_MENTION': {
    actorId: string;
    postId: string;
    mentionedUserId: string;
  };
  'notification:POST_REPLY': {
    actorId: string;
    postId: string;
    parentId: string;
  };
  'notification:POST_COMMENT': { actorId: string; postId: string };

  'notification:FOLLOW': { actorId: string; userId: string };
}

export type EventName = keyof EventPayloadMap;
