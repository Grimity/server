import { ApiProperty } from '@nestjs/swagger';
import { CursorResponse } from 'src/shared/response/cursor.response';

export class AdminFeedAuthorResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  url: string | null;
}

export class AdminFeedAlbumResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class AdminLatestFeedResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  thumbnail: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ type: AdminFeedAuthorResponse })
  author: AdminFeedAuthorResponse;
}

export class AdminLatestFeedsResponse extends CursorResponse {
  @ApiProperty({ type: AdminLatestFeedResponse, isArray: true })
  feeds: AdminLatestFeedResponse[];
}

export class AdminFeedDetailResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'string', isArray: true })
  cards: string[];

  @ApiProperty()
  thumbnail: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: 'string', isArray: true })
  tags: string[];

  @ApiProperty({ type: AdminFeedAuthorResponse })
  author: AdminFeedAuthorResponse;

  @ApiProperty({ type: AdminFeedAlbumResponse, nullable: true })
  album: AdminFeedAlbumResponse | null;
}
