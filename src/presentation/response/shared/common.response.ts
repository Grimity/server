import { ApiProperty } from '@nestjs/swagger';

export class IdResponse {
  @ApiProperty()
  id: string;
}

export class TotalCountResponse {
  @ApiProperty()
  totalCount: number;
}
