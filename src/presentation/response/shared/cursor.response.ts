import { ApiProperty } from '@nestjs/swagger';

export class CursorResponse {
  @ApiProperty({ type: 'string', nullable: true })
  nextCursor: string | null;
}

export class CursorAndCountResponse extends CursorResponse {
  @ApiProperty()
  totalCount: number;
}
