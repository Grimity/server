import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsOptional, IsUUID } from 'class-validator';
import { IsImageWithPrefix } from '../../../shared/request/validator';
import { TrimNullableString } from '../../../shared/request/validator';
import { CursorRequest } from '../../../shared/request';

export class CreateChatMessageRequest {
  @ApiProperty()
  @IsUUID()
  chatId: string;

  @ApiProperty({ description: '본문내용', required: false, nullable: true })
  @TrimNullableString()
  @IsOptional()
  content: string | null;

  @ApiProperty({
    type: 'string',
    isArray: true,
    example: ['chat/{UUID}.jpg'],
    minLength: 0,
    maxLength: 5,
  })
  @ArrayMaxSize(5)
  @IsImageWithPrefix('chat/', { each: true })
  images: string[];

  @ApiProperty({
    description: '답장 채팅메시지 ID',
    required: false,
    nullable: true,
  })
  @TrimNullableString()
  @IsOptional()
  @IsUUID()
  replyToId: string | null;
}

export class GetChatMessagesRequest extends CursorRequest {
  @ApiProperty({ description: '채팅방 ID' })
  @IsUUID()
  chatId: string;
}
