import { ApiProperty } from '@nestjs/swagger';
import { CursorResponse } from 'src/shared/response';
import { UserBaseResponse } from 'src/module/user/dto';
import { ChatMessageResponse, ReplyToResponse } from './chat-message.response';

export class ChatResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({
    type: 'number',
    example: 3,
    description: '읽지 않은 메시지 수',
  })
  unreadCount: number;

  @ApiProperty({
    type: Date,
    example: '2023-10-01T12:00:00Z',
    description: '채팅방 생성 시간',
  })
  createdAt: Date;

  @ApiProperty({
    type: UserBaseResponse,
    description: '채팅 상대의 사용자 정보',
  })
  opponent: UserBaseResponse;

  @ApiProperty({
    type: ReplyToResponse,
    nullable: true,
    description: '채팅방의 마지막 메시지',
  })
  lastMessage?: ReplyToResponse | null;
}

export class SearchedChatsResponse extends CursorResponse {
  @ApiProperty({ type: ChatResponse, isArray: true })
  chats: ChatResponse[];
}
