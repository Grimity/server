import type { RedisToEventPayload } from 'src/database/redis/redis-event.types';

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

  'post:CREATED': { postId: string; title: string; content: string };

  push: PushPayload;

  // Redis Pub/Sub -> EventEmitter로 전달되는 채팅 이벤트
  newChatMessage: RedisToEventPayload<'newChatMessage'>;
  likeChatMessage: RedisToEventPayload<'likeChatMessage'>;
  unlikeChatMessage: RedisToEventPayload<'unlikeChatMessage'>;
  deleteChat: RedisToEventPayload<'deleteChat'>;
}

export interface PushPayload {
  userId: string;
  title: string;
  text: string;
  imageUrl?: string | null;
  data?: Record<string, string>;
  silent?: boolean;
  key?: string;
  badge?: number;
}

export type EventName = keyof EventPayloadMap;
