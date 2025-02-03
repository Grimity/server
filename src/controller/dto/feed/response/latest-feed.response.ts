import { ApiProperty } from '@nestjs/swagger';

import { SimpleAuthorDto } from './simple-author.dto';

export class LatestFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'string', isArray: true, example: ['feed/UUID.png'] })
  cards: string[];

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

  @ApiProperty({ type: SimpleAuthorDto })
  author: SimpleAuthorDto;
}

export class LatestFeedsResponse {
  @ApiProperty({ type: LatestFeedDto, isArray: true })
  feeds: LatestFeedDto[];

  @ApiProperty({
    description: 'cursor가 null이면 다음 데이터가 없음',
    nullable: true,
    type: 'string',
  })
  nextCursor: string | null;
}
