import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { CursorRequest } from 'src/shared/request';

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
  @IsOptional()
  username?: string;
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
