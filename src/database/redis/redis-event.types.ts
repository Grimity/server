export interface RedisEventPayloadMap {
  newChatMessage: {
    chatId: string;
    senderId: string;
    chatUsers: {
      id: string;
      name: string;
      image: string | null;
      url: string;
      unreadCount: number;
    }[];
    messages: {
      id: string;
      content: string | null;
      image: string | null;
      createdAt: Date;
      replyTo: {
        id: string;
        content: string | null;
        image: string | null;
        createdAt: Date;
      } | null;
    }[];
  };

  likeChatMessage: {
    messageId: string;
  };

  unlikeChatMessage: {
    messageId: string;
  };

  deleteChat: {
    chatIds: string[];
  };
}

export type RedisEventName = keyof RedisEventPayloadMap;

// Redis -> EventEmitter로 전달될 때 targetUserId가 추가됨
export type RedisToEventPayload<K extends RedisEventName> =
  RedisEventPayloadMap[K] & { targetUserId: string };
