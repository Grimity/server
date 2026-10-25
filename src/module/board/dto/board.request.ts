import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class JoinBoardRequest {
  @ApiProperty({
    required: false,
    description:
      '이전 입장에서 받은 보드 토큰. 비로그인 사용자가 같은 게스트 신원(내 그림)을 유지하려면 보냅니다. 만료돼도 됩니다.',
  })
  @IsOptional()
  @IsString()
  boardToken?: string;
}
