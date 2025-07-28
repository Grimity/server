import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export class CreateChatRequest {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;
}

export class JoinChatRequest {
  @ApiProperty()
  @Length(1)
  @IsString()
  socketId: string;
}
