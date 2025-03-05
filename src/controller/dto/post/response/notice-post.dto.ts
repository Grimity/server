import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameResponse } from 'src/presentation/response/user.response';

export class NoticePostDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['NOTICE'] })
  type: 'NOTICE';

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: 'string', nullable: true })
  thumbnail: string | null;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: IdAndNameResponse })
  author: IdAndNameResponse;
}
