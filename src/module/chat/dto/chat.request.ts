import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CursorRequest } from 'src/shared/request';

export class CreateChatRequest {
  @ApiProperty()
  @IsUUID()
  targetUserId: string;
}

export class SearchChatRequest extends CursorRequest {
  @ApiProperty({
    required: false,
    description: '검색할 사용자 이름',
    example: 'user123',
  })
  @IsOptional()
  username?: string;
}
