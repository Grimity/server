import { ApiProperty } from '@nestjs/swagger';
import { SimpleAuthorDto } from '../../feed/response/simple-author.dto';

class MyLikeFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  cards: string[];

  @ApiProperty({ example: 'feed/UUID.jpg' })
  thumbnail: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: SimpleAuthorDto })
  author: SimpleAuthorDto;
}

export class MyLikeFeedsResponse {
  @ApiProperty({ type: 'string', nullable: true })
  nextCursor: string | null;

  @ApiProperty({ type: MyLikeFeedDto, isArray: true })
  feeds: MyLikeFeedDto[];
}
