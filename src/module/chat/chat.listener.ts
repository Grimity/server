import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GlobalGateway } from '../websocket/global.gateway';
import type { NewChatMessageEventResponse } from './dto';

@Injectable()
export class ChatListener {
  constructor(private readonly gateway: GlobalGateway) {}

  @OnEvent('newChatMessage')
  handleNewChatMessageEvent({
    targetUserId,
    ...payload
  }: NewChatMessageEventResponse & { targetUserId: string }) {
    this.gateway.emitMessageEventToUser(targetUserId, payload);
  }

  @OnEvent('likeChatMessage')
  handleLikeChatMessageEvent(payload: { userId: string; messageId: string }) {
    const { userId, messageId } = payload;
    this.gateway.emitLikeChatMessageEventToChat(messageId, userId);
  }

  @OnEvent('unlikeChatMessage')
  handleUnlikeChatMessageEvent(payload: { userId: string; messageId: string }) {
    const { userId, messageId } = payload;
    this.gateway.emitUnlikeChatMessageEventToChat(messageId, userId);
  }

  @OnEvent('deleteChat')
  handleDeleteChatEvent(payload: { targetUserId: string; chatIds: string[] }) {
    const { targetUserId, chatIds } = payload;
    this.gateway.emitDeleteChatEventToUser(targetUserId, chatIds);
  }
}
