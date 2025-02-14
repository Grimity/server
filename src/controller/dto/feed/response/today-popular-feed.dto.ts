import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from './simple-author.dto';

export class TodayPopularFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: 'feed/UUID.png' })
  thumbnail: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({ description: '비 로그인유저면 false 고정' })
  isLike: boolean;

  @ApiProperty({ type: IdAndNameDto })
  author: IdAndNameDto;
}
