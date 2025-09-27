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
  handleLikeChatMessageEvent(payload: {
    targetUserId: string;
    messageId: string;
  }) {
    const { targetUserId, messageId } = payload;
    this.gateway.emitLikeChatMessageEventToUser(targetUserId, messageId);
  }

  @OnEvent('unlikeChatMessage')
  handleUnlikeChatMessageEvent(payload: {
    targetUserId: string;
    messageId: string;
  }) {
    const { targetUserId, messageId } = payload;
    this.gateway.emitUnlikeChatMessageEventToUser(targetUserId, messageId);
  }

  @OnEvent('deleteChat')
  handleDeleteChatEvent(payload: { targetUserId: string; chatIds: string[] }) {
    const { targetUserId, chatIds } = payload;
    this.gateway.emitDeleteChatEventToUser(targetUserId, chatIds);
  }
}
