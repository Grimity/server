import { ApiProperty } from '@nestjs/swagger';
import { CursorResponse } from '../../../shared/response';
import { UserBaseResponse } from '../../user/dto';
import { ChatMessageBaseResponse } from './chat-message.base.response';

export class ReplyToResponse extends ChatMessageBaseResponse {}

export class ChatMessageResponse extends ChatMessageBaseResponse {
  @ApiProperty({ type: UserBaseResponse })
  user: UserBaseResponse;

  @ApiProperty()
  isLike: boolean;

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
    description: '최소 1개 최대 6개',
  })
  messages: ChatMessageEventResponse[];
}
