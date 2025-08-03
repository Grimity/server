import { ApiProperty } from '@nestjs/swagger';
import { CursorResponse } from 'src/shared/response';
import { UserBaseResponse } from 'src/module/user/dto';
import { ChatMessageResponse } from './chat-message.response';

export class ChatResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty({
    description: '채팅방 생성 시간',
  })
  createdAt: Date;

  @ApiProperty({
    type: UserBaseResponse,
    description: '채팅 상대의 사용자 정보',
  })
  opponent: UserBaseResponse;

  @ApiProperty({
    type: ChatMessageResponse,
    nullable: true,
    description: '채팅방의 마지막 메시지',
  })
  lastMessage?: ChatMessageResponse | null;
}

export class SearchedChatsResponse extends CursorResponse {
  @ApiProperty({ type: ChatResponse, isArray: true })
  chats: ChatResponse[];
}
