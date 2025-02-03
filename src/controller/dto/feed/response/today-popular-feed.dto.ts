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

export class TodayPopularFeedResponse {
  @ApiProperty({ type: TodayPopularFeedDto, isArray: true })
  feeds: TodayPopularFeedDto[];

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'cursor가 null이면 다음데이터는 없습니다',
  })
  nextCursor: string | null;
}
