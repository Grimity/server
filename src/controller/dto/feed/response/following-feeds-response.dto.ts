import { ApiProperty } from '@nestjs/swagger';
import { SimpleAuthorDto } from './simple-author.dto';

export class FollowingFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'string', isArray: true, example: ['feed/UUID.png'] })
  cards: string[];

  @ApiProperty({ example: 'feed/UUID.png' })
  thumbnail: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  isAI: boolean;

  @ApiProperty({ type: SimpleAuthorDto })
  author: SimpleAuthorDto;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  isSave: boolean;

  @ApiProperty()
  tags: string[];
}

export class FollowingFeedsResponse {
  @ApiProperty({ type: FollowingFeedDto, isArray: true })
  feeds: FollowingFeedDto[];

  @ApiProperty({
    description: 'cursor가 null이면 다음데이터는 없습니다',
    nullable: true,
    type: 'string',
  })
  nextCursor: string | null;
}
