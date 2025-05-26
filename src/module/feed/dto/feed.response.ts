import { ApiProperty } from '@nestjs/swagger';
import { UserBaseResponse } from '../../user/dto/user.response';
import {
  CursorAndCountResponse,
  CursorResponse,
} from '../../../shared/response/cursor.response';
import { AlbumBaseResponse } from '../../album/dto/album.response';

// 최소단위
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

class FeedResponse extends FeedBaseResponse {
  @ApiProperty({ type: 'string', isArray: true, example: ['feed/UUID.webp'] })
  cards: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  content: string;

  @ApiProperty()
  tags: string[];

  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;
}

class SearchedFeedResponse extends FeedBaseResponse {
  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  tags: string[];
}

export class SearchedFeedsResponse extends CursorAndCountResponse {
  @ApiProperty({ type: SearchedFeedResponse, isArray: true })
  feeds: SearchedFeedResponse[];
}

class LatestFeedResponse extends FeedBaseResponse {
  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isLike: boolean;
}

export class LatestFeedsResponse extends CursorResponse {
  @ApiProperty({ type: LatestFeedResponse, isArray: true })
  feeds: LatestFeedResponse[];
}

export class TodayPopularFeedResponse extends FeedBaseResponse {
  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;
}

class PopularFeedResponse extends FeedBaseResponse {
  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;
}

export class PopularFeedsResponse extends CursorResponse {
  @ApiProperty({ type: PopularFeedResponse, isArray: true })
  feeds: PopularFeedResponse[];
}

class FollowingFeedResponse extends FeedResponse {
  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  isSave: boolean;
}

export class FollowingFeedsResponse extends CursorResponse {
  @ApiProperty({ type: FollowingFeedResponse, isArray: true })
  feeds: FollowingFeedResponse[];
}

export class FeedDetailResponse extends FeedResponse {
  @ApiProperty()
  isLike: boolean;

  @ApiProperty()
  isSave: boolean;

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ type: AlbumBaseResponse, nullable: true })
  album: AlbumBaseResponse | null;
}

export class FeedMetaResponse extends FeedBaseResponse {
  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  tags: string[];
}

export class SearchedFeedByTagsResponse extends FeedBaseResponse {
  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;
}

class MyLikeFeedResponse extends FeedBaseResponse {
  @ApiProperty({ type: 'string', isArray: true, example: ['feed/UUID.webp'] })
  cards: string[];

  @ApiProperty()
  commentCount: number;

  @ApiProperty({ description: '내가 좋아요/저장 한 시간' })
  createdAt: Date;

  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;
}

export class MyLikeFeedsResponse extends CursorResponse {
  @ApiProperty({ type: MyLikeFeedResponse, isArray: true })
  feeds: MyLikeFeedResponse[];
}

class UserFeedResponse extends FeedBaseResponse {
  @ApiProperty({ type: 'string', isArray: true, example: ['feed/UUID.webp'] })
  cards: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  commentCount: number;
}

export class UserFeedsResponse extends CursorResponse {
  @ApiProperty({ type: UserFeedResponse, isArray: true })
  feeds: UserFeedResponse[];
}

export class FeedRankingResponse extends FeedBaseResponse {
  @ApiProperty()
  isLike: boolean;

  @ApiProperty({ type: UserBaseResponse })
  author: UserBaseResponse;
}

export class FeedRankingsResponse {
  @ApiProperty({ type: [FeedRankingResponse] })
  feeds: FeedRankingResponse[];
}
