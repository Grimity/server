import { ApiProperty } from '@nestjs/swagger';
import { IdAndNameResponse } from './user.response';
import { TotalCountResponse } from './shared';
import { postTypes } from 'src/common/constants';

export class PostBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ type: 'string', nullable: true, description: 'FULL URL' })
  thumbnail: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class PostResponse extends PostBaseResponse {
  @ApiProperty({ enum: postTypes })
  type: (typeof postTypes)[number];

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ type: IdAndNameResponse })
  author: IdAndNameResponse;
}

export class PostsResponse extends TotalCountResponse {
  @ApiProperty({ type: PostResponse, isArray: true })
  posts: PostResponse[];
}

export class PostDetailResponse extends PostResponse {
  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  isSave: boolean;
}

export class MySavePostsResponse extends TotalCountResponse {
  @ApiProperty({ type: PostResponse, isArray: true })
  posts: PostResponse[];
}
