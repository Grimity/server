import { ApiProperty } from '@nestjs/swagger';

class UserFeedDto {
  @ApiProperty({ description: '피드 아이디' })
  id: string;

  @ApiProperty({ description: '피드 제목' })
  title: string;

  @ApiProperty({ example: ['feed/test.jpg'], type: 'string', isArray: true })
  cards: string[];

  @ApiProperty({ description: '썸네일', example: 'feed/test.jpg' })
  thumbnail: string;

  @ApiProperty({ description: '피드 생성일' })
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  isLike: boolean;
}

export class UserFeedsResponse {
  @ApiProperty({
    description: 'null이면 다음데이터 없음',
    type: 'string',
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({ description: '피드 목록', type: UserFeedDto, isArray: true })
  feeds: UserFeedDto[];
}
