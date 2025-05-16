import { ApiProperty } from '@nestjs/swagger';

export class ConflictResponse {
  @ApiProperty({ enum: [409] })
  statusCode: 409;
}
