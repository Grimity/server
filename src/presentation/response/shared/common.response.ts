import { ApiProperty } from '@nestjs/swagger';

export class IdResponse {
  @ApiProperty()
  id: string;
}

export class TotalCountResponse {
  @ApiProperty()
  totalCount: number;
}

export class ConflictResponse {
  @ApiProperty({ enum: [409] })
  statusCode: 409;
}
