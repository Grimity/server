import { ApiProperty } from '@nestjs/swagger';

export class FeedBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ example: 'feed/UUID.webp' })
  thumbnail: string;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  viewCount: number;
}

export class FeedResponse extends FeedBaseResponse {
  @ApiProperty({ type: 'string', isArray: true, example: ['feed/UUID.webp'] })
  cards: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  content: string;

  @ApiProperty()
  tags: string[];
}
