import { ApiProperty } from '@nestjs/swagger';
import { CursorResponse } from 'src/shared/response/cursor.response';
import { postTypes } from 'src/common/constants/post.constant';

export class AdminPostAuthorResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ type: 'string', nullable: true })
  image: string | null;
}

export class AdminLatestPostResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: postTypes })
  type: (typeof postTypes)[number];

  @ApiProperty()
  title: string;

  @ApiProperty({ type: 'string', nullable: true })
  thumbnail: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ type: AdminPostAuthorResponse })
  author: AdminPostAuthorResponse;
}

export class AdminLatestPostsResponse extends CursorResponse {
  @ApiProperty({ type: AdminLatestPostResponse, isArray: true })
  posts: AdminLatestPostResponse[];
}

export class AdminPostDetailResponse {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: postTypes })
  type: (typeof postTypes)[number];

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: 'string', nullable: true })
  thumbnail: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ type: AdminPostAuthorResponse })
  author: AdminPostAuthorResponse;
}
