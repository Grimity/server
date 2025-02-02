import { ApiProperty } from '@nestjs/swagger';
import { SimpleAuthorDto } from './simple-author.dto';

class SearchedFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: 'feed/UUID.jpg' })
  thumbnail: string;

  @ApiProperty({ type: 'string', isArray: true })
  cards: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  tags: string[];

  @ApiProperty({ type: SimpleAuthorDto })
  author: SimpleAuthorDto;
}

export class FeedSearchResponse {
  @ApiProperty({ type: 'string', nullable: true })
  nextCursor: string | null;

  @ApiProperty({ type: SearchedFeedDto, isArray: true })
  feeds: SearchedFeedDto[];
}
