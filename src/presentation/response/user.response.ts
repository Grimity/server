import { ApiProperty } from '@nestjs/swagger';
import { socialProviders } from 'src/common/constants';
import { CursorResponse } from './shared/cursor.response';

// 최소단위 User
export class UserResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class UserImageResponse extends UserResponse {
  @ApiProperty({
    example: 'profile/{UUID}.jpg',
    nullable: true,
    type: 'string',
  })
  image: string | null;
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

export class MyProfileResponse extends UserImageResponse {
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
}

class FollowUserResponse extends UserImageResponse {
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
