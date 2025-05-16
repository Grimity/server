import { ApiProperty } from '@nestjs/swagger';

export class TotalCountResponse {
  @ApiProperty()
  totalCount: number;
}
