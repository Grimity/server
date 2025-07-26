import { ApiProperty } from '@nestjs/swagger';
import { CursorResponse } from '../../../shared/response';
import { UserBaseResponse } from '../../../module/user/dto';

export class ReplyToResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: 'string', nullable: true })
  content: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'https://image.grimity.com/chat/123.webp',
  })
  image: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class ChatMessageResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: UserBaseResponse })
  user: UserBaseResponse;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'https://image.grimity.com/chat/123.webp',
  })
  image: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  content: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: ReplyToResponse, nullable: true })
  replyTo: ReplyToResponse | null;
}

export class ChatMessagesResponse extends CursorResponse {
  @ApiProperty({ type: ChatMessageResponse, isArray: true })
  messages: ChatMessageResponse[];
}
