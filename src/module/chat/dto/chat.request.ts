import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ArrayMinSize, IsUUID, Length } from 'class-validator';
import { CursorRequest } from '../../../shared/request';
import { TrimNullableString, TrimString } from 'src/shared/request/validator';

export class CreateChatRequest {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;
}

export class GetChatsRequest extends CursorRequest {
  @ApiProperty({
    required: false,
    description: '검색할 사용자 이름',
    example: 'user123',
  })
  @TrimNullableString()
  @IsOptional()
  @Length(1, 20)
  keyword?: string;
}

export class JoinChatRequest {
  @ApiProperty()
  @Length(1)
  socketId: string;
}

export class LeaveChatRequest {
  @ApiProperty()
  @Length(1)
  socketId: string;
}

export class BatchDeleteChatsRequest {
  @ApiProperty({ type: 'string', isArray: true, minLength: 1 })
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids: string[];
}
