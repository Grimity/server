import { ApiProperty } from '@nestjs/swagger';

export class FeedIdDto {
  @ApiProperty({ description: '생성된 피드의 ID' })
  id: string;
}
