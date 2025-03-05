import { ApiProperty } from '@nestjs/swagger';

export class CursorResponse {
  @ApiProperty({ type: 'string', nullable: true })
  nextCursor: string | null;
}
