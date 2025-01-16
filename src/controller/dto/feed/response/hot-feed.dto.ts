import { ApiProperty } from '@nestjs/swagger';
import { AuthorSimpleDto } from './get-feeds-response.dto';

export class HotFeedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'string', isArray: true, example: ['feed/UUID.png'] })
  cards: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty({ type: AuthorSimpleDto })
  author: AuthorSimpleDto;
}
