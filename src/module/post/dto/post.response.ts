import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto';
import { TotalCountResponse } from '../../../shared/response/total-count.response';
import { postTypes } from '../../../common/constants/post.constant';

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

  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;
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

export class MyPostResponse extends PostBaseResponse {
  @ApiProperty({ enum: postTypes })
  type: (typeof postTypes)[number];

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  viewCount: number;
}
