import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameDto } from './simple-author.dto';

class SearchedFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: 'feed/UUID.jpg' })
  thumbnail: string;

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

  @ApiProperty({ type: IdAndNameDto })
  author: IdAndNameDto;
}

export class FeedSearchResponse {
  @ApiProperty()
  totalCount: number;

  @ApiProperty({ type: 'string', nullable: true })
  nextCursor: string | null;

  @ApiProperty({ type: SearchedFeedDto, isArray: true })
  feeds: SearchedFeedDto[];
}
