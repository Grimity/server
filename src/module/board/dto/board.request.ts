import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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

export class BoardSnapshotQuery {
  @ApiProperty({
    required: false,
    description: '이전 응답의 nextCursor. 처음에는 보내지 않습니다.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cursor?: number;
}
