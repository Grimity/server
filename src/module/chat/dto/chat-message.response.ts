import { ApiProperty } from '@nestjs/swagger';
import { ChatMessageType } from '@prisma/client';
import { CursorResponse } from '../../../shared/response';
import { UserBaseResponse } from '../../user/dto';
import { ChatMessageBaseResponse } from './chat-message.base.response';

export class ReplyToResponse extends ChatMessageBaseResponse {}

export class ChatMessageResponse extends ChatMessageBaseResponse {
  @ApiProperty({ type: UserBaseResponse })
  user: UserBaseResponse;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({
    enum: ChatMessageType,
    description: '메시지 타입 (USER: 일반, COMMISSION_*: 시스템 메시지)',
  })
  type: ChatMessageType;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description:
      '시스템 메시지 클릭 시 이동 대상 ID (커미션 등). 일반 메시지는 null',
  })
  referenceId: string | null;

  @ApiProperty({ type: ReplyToResponse, nullable: true })
  replyTo: ReplyToResponse | null;
}

export class ChatMessagesResponse extends CursorResponse {
  @ApiProperty({ type: ChatMessageResponse, isArray: true })
  messages: ChatMessageResponse[];
}

export class ChatUserEventResponse extends UserBaseResponse {
  @ApiProperty()
  unreadCount: number;
}

export class ChatMessageEventResponse extends ChatMessageBaseResponse {
  @ApiProperty({
    enum: ChatMessageType,
    description: '메시지 타입 (USER: 일반, COMMISSION_*: 시스템 메시지)',
  })
  type: ChatMessageType;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description:
      '시스템 메시지 클릭 시 이동 대상 ID (커미션 등). 일반 메시지는 null',
  })
  referenceId: string | null;

  @ApiProperty({ type: ChatMessageBaseResponse, nullable: true })
  replyTo: ChatMessageBaseResponse | null;
}

export class NewChatMessageEventResponse {
  @ApiProperty()
  chatId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty({ type: ChatUserEventResponse, isArray: true })
  chatUsers: ChatUserEventResponse[];

  @ApiProperty({
    type: ChatMessageEventResponse,
    isArray: true,
    description: '1개 (텍스트+이미지가 한 메시지로 묶임)',
  })
  messages: ChatMessageEventResponse[];
}
