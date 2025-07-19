import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateChatRequest {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;
}
