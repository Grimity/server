import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GlobalGateway } from '../websocket/global.gateway';
import type { EventPayloadMap } from 'src/infrastructure/event/event-payload.types';

@Injectable()
export class ChatListener {
  constructor(private readonly gateway: GlobalGateway) {}

  @OnEvent('newChatMessage')
  handleNewChatMessageEvent(payload: EventPayloadMap['newChatMessage']) {
    const { targetUserId, ...rest } = payload;
    this.gateway.emitMessageEventToUser(targetUserId, rest);
  }

  @OnEvent('likeChatMessage')
  handleLikeChatMessageEvent(payload: EventPayloadMap['likeChatMessage']) {
    const { targetUserId, messageId } = payload;
    this.gateway.emitLikeChatMessageEventToUser(targetUserId, messageId);
  }

  @OnEvent('unlikeChatMessage')
  handleUnlikeChatMessageEvent(payload: EventPayloadMap['unlikeChatMessage']) {
    const { targetUserId, messageId } = payload;
    this.gateway.emitUnlikeChatMessageEventToUser(targetUserId, messageId);
  }

  @OnEvent('deleteChat')
  handleDeleteChatEvent(payload: EventPayloadMap['deleteChat']) {
    const { targetUserId, chatIds } = payload;
    this.gateway.emitDeleteChatEventToUser(targetUserId, chatIds);
  }
}
