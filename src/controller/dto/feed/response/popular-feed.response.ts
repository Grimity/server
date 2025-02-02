import { ApiProperty } from '@nestjs/swagger';
import { SimpleAuthorDto } from './simple-author.dto';

class PopularFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: 'feed/UUID.jpg' })
  thumbnail: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: SimpleAuthorDto })
  author: SimpleAuthorDto;
}

export class PopularFeedResponse {
  @ApiProperty({ type: 'string', nullable: true })
  nextCursor: string | null;

  @ApiProperty({ type: PopularFeedDto, isArray: true })
  feeds: PopularFeedDto[];
}
