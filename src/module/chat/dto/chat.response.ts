import { ApiProperty } from '@nestjs/swagger';
import { CursorResponse } from '../../../shared/response';
import { UserBaseResponse } from '../../../module/user/dto';
import { ChatMessageBaseResponse } from './chat-message.response';

export class LastChatMessageResponse extends ChatMessageBaseResponse {
  @ApiProperty({
    description: '보낸 사람의 ID (마지막 채팅을 내가 보냈을수도잇음)',
  })
  senderId: string;
}

export class ChatResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  enteredAt: Date;

  @ApiProperty({
    type: UserBaseResponse,
    description: '채팅 상대의 사용자 정보',
  })
  opponentUser: UserBaseResponse;

  @ApiProperty({
    type: LastChatMessageResponse,
    nullable: true,
    description: '채팅방의 마지막 메시지',
  })
  lastMessage: LastChatMessageResponse | null;
}

export class ChatsResponse extends CursorResponse {
  @ApiProperty({ type: ChatResponse, isArray: true })
  chats: ChatResponse[];
}
