import { ApiProperty } from '@nestjs/swagger';
import { socialProviders } from '../../../common/constants/social-provider.constant';
import {
  CursorResponse,
  CursorAndCountResponse,
} from '../../../shared/response/cursor.response';
import { ConflictResponse } from '../../../shared/response/conflict.response';
import { AlbumBaseResponse } from '../../album/dto/album.response';

// 최소단위 User
export class UserBaseResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    example: 'profile/{UUID}.jpg',
    nullable: true,
    type: 'string',
  })
  image: string | null;

  @ApiProperty({ description: '라우팅용 url' })
  url: string;
}

export class LinkResponse {
  @ApiProperty({ example: '인스타그램' })
  linkName: string;

  @ApiProperty({ example: 'https://www.instagram.com/username' })
  link: string;
}

export class SubscriptionResponse {
  @ApiProperty({
    enum: [
      'FOLLOW',
      'FEED_LIKE',
      'FEED_COMMENT',
      'FEED_REPLY',
      'POST_COMMENT',
      'POST_REPLY',
    ],
    isArray: true,
  })
  subscription: string[];
}

export class MyProfileResponse extends UserBaseResponse {
  @ApiProperty({ enum: socialProviders })
  provider: string;

  @ApiProperty()
  email: string;

  @ApiProperty({
    example: 'background/{UUID}.jpg',
    nullable: true,
    type: 'string',
  })
  backgroundImage: string | null;

  @ApiProperty({ description: 'not null인데 공백 허용' })
  description: string;

  @ApiProperty({ type: LinkResponse, isArray: true })
  links: LinkResponse[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  hasNotification: boolean;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;
}

class FollowUserResponse extends UserBaseResponse {
  @ApiProperty({ description: 'not null인데 공백은 허용' })
  description: string;
}

export class MyFollowersResponse extends CursorResponse {
  @ApiProperty({ type: FollowUserResponse, isArray: true })
  followers: FollowUserResponse[];
}

export class MyFollowingsResponse extends CursorResponse {
  @ApiProperty({ type: FollowUserResponse, isArray: true })
  followings: FollowUserResponse[];
}

class SearchedUserResponse extends UserBaseResponse {
  @ApiProperty({ description: 'not null인데 공백은 허용' })
  description: string;

  @ApiProperty({
    example: 'background/{UUID}.jpg',
    nullable: true,
    type: 'string',
  })
  backgroundImage: string | null;

  @ApiProperty()
  isFollowing: boolean;

  @ApiProperty()
  followerCount: number;
}

export class SearchedUsersResponse extends CursorAndCountResponse {
  @ApiProperty({ type: SearchedUserResponse, isArray: true })
  users: SearchedUserResponse[];
}

export class PopularUserResponse extends UserBaseResponse {
  @ApiProperty({ description: 'not null인데 공백은 허용' })
  description: string;

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  isFollowing: boolean;

  @ApiProperty({ type: 'string', isArray: true, example: ['feed/{UUID}.jpg'] })
  thumbnails: string[];
}

export class AlbumWithCountResponse extends AlbumBaseResponse {
  @ApiProperty()
  feedCount: number;
}

export class UserProfileResponse extends UserBaseResponse {
  @ApiProperty({ description: 'not null인데 공백은 허용' })
  description: string;

  @ApiProperty({
    example: 'background/{UUID}.jpg',
    nullable: true,
    type: 'string',
  })
  backgroundImage: string | null;

  @ApiProperty({ type: LinkResponse, isArray: true })
  links: LinkResponse[];

  @ApiProperty()
  followerCount: number;

  @ApiProperty()
  followingCount: number;

  @ApiProperty()
  feedCount: number;

  @ApiProperty()
  postCount: number;

  @ApiProperty()
  isFollowing: boolean;

  @ApiProperty({ type: AlbumWithCountResponse, isArray: true })
  albums: AlbumWithCountResponse[];
}

export class UserMetaResponse extends UserBaseResponse {
  @ApiProperty({ description: 'not null인데 공백은 허용' })
  description: string;
}

export class FeedLikedUserResponse extends UserBaseResponse {
  @ApiProperty({ description: 'not null인데 공백은 허용' })
  description: string;
}

export class UpdateProfileConflictResponse extends ConflictResponse {
  @ApiProperty({ enum: ['NAME', 'URL'] })
  message: 'NAME' | 'URL';
}
