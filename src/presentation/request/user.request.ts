import { ApiProperty } from '@nestjs/swagger';
import {
  Length,
  IsUrl,
  ArrayMaxSize,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TrimString, IsImageWithPrefix } from './helper';
import { subscriptionTypes, SubscriptionType } from 'src/common/constants';

class UpdateLinkRequest {
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
  @ArrayMaxSize(3)
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
  @IsEnum(subscriptionTypes, { each: true })
  subscription: SubscriptionType[];
}
