import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from '../../feed/response/simple-author.dto';
import { PostType } from 'src/common/constants';

export class TodayPopularDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['NOTICE', 'NORMAL', 'QUESTION', 'FEEDBACK'] })
  type: PostType;

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
