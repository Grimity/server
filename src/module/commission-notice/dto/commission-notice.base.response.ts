import { ApiProperty } from '@nestjs/swagger';

export class CommissionNoticeBaseResponse {
  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  updatedAt: Date;
}
