import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto';
import { TotalCountResponse } from '../../../shared/response/total-count.response';
import { postTypes } from '../../../common/constants/post.constant';
import { PostBaseResponse, PostResponse } from './post.base.response';

export class PostWithAuthorResponse extends PostResponse {
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
  @ApiProperty({ type: PostWithAuthorResponse, isArray: true })
  posts: PostWithAuthorResponse[];
}

export class PostDetailResponse extends PostWithAuthorResponse {
  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  isSave: boolean;
}

export class MySavePostsResponse extends TotalCountResponse {
  @ApiProperty({ type: PostWithAuthorResponse, isArray: true })
  posts: PostWithAuthorResponse[];
}

export class MyPostResponse extends PostBaseResponse {
  @ApiProperty({ enum: postTypes })
  type: (typeof postTypes)[number];

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  viewCount: number;
}
