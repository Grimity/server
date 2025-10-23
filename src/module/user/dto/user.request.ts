import { ApiProperty } from '@nestjs/swagger';
import {
  Length,
  IsUrl,
  ArrayMaxSize,
  ValidateNested,
  IsIn,
  IsOptional,
  Validate,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  TrimString,
  IsImageWithPrefix,
  TrimAndLowerNullableString,
  TrimNullableString,
  UrlValidator,
} from '../../../shared/request/validator';
import {
  subscriptionTypes,
  SubscriptionType,
} from '../../../common/constants/subscription.constant';
import {
  CursorRequest,
  CursorKeywordRequest,
} from '../../../shared/request/cursor.request';

export class UpdateLinkRequest {
  @ApiProperty({ example: '인스타그램', minLength: 1, maxLength: 30 })
  @TrimString()
  @Length(1, 30)
  linkName: string;

  @ApiProperty({ example: 'https://www.instagram.com/username' })
  @TrimString()
  @IsUrl()
  link: string;
}

export class UpdateUserRequest {
  @ApiProperty({ minLength: 2, maxLength: 12 })
  @TrimString()
  @Length(2, 12)
  name: string;

  @ApiProperty({ minLength: 2, maxLength: 20 })
  @TrimNullableString()
  @Length(2, 20)
  @Validate(UrlValidator)
  url: string;

  @ApiProperty({
    description: '없으면 빈 문자열 주세요',
    minLength: 0,
    maxLength: 200,
  })
  @TrimString()
  @Length(0, 200)
  description: string;

  @ApiProperty({
    type: UpdateLinkRequest,
    isArray: true,
    nullable: true,
    maximum: 3,
  })
  @Transform(({ value }) => (value === null ? [] : value))
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => UpdateLinkRequest)
  links: UpdateLinkRequest[];
}

export class UpdateProfileImageRequest {
  @ApiProperty({ example: 'profile/{UUID}.jpg' })
  @IsImageWithPrefix('profile/')
  imageName: string;
}

export class UpdateBackgroundImageRequest {
  @ApiProperty({ example: 'background/{UUID}.jpg' })
  @IsImageWithPrefix('background/')
  imageName: string;
}

export class UpdateSubscriptionRequest {
  @ApiProperty({ enum: subscriptionTypes, isArray: true })
  @IsIn(subscriptionTypes, { each: true })
  subscription: SubscriptionType[];
}

export class SearchUserRequest extends CursorKeywordRequest {}

export const GetFeedsByUserSort = ['latest', 'like', 'oldest'] as const;

export class GetFeedsByUserRequest extends CursorRequest {
  @ApiProperty({ required: false, enum: GetFeedsByUserSort })
  @TrimAndLowerNullableString()
  @IsOptional()
  @IsIn(GetFeedsByUserSort)
  sort?: (typeof GetFeedsByUserSort)[number];

  @ApiProperty({ required: false, type: 'string', description: '없으면 전체' })
  @IsOptional()
  @IsUUID()
  albumId?: string | null;
}

export class CheckNameRequest {
  @ApiProperty({ minLength: 2, maxLength: 12 })
  @TrimString()
  @Length(2, 12)
  name: string;
}

export class GetFollowingRequest extends CursorRequest {
  @ApiProperty({ required: false })
  @TrimString()
  @IsOptional()
  @Length(1)
  keyword?: string;
}

export class RegisterPushTokenRequest {
  @ApiProperty()
  @Length(1)
  deviceId: string;

  @ApiProperty()
  @Length(1)
  token: string;
}
