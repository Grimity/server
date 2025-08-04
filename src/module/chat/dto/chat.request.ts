import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsString, IsUUID, Length } from 'class-validator';

export class CreateChatRequest {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;
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
