import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';

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

  @ApiProperty({ type: IdAndNameDto })
  author: IdAndNameDto;
}
