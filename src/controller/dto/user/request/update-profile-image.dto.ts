import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsProfileImage', async: false })
export class IsProfileImage implements ValidatorConstraintInterface {
  validate(image: string) {
    return (
      typeof image === 'string' &&
      image.startsWith('profile/') &&
      image.includes('.')
    );
  }

  defaultMessage() {
    return '이미지는 profile/로 시작하고 확장자를 포함해야 합니다';
  }
}

export class UpdateProfileImageDto {
  @ApiProperty({ example: 'profile/{UUID}.jpg' })
  @IsString()
  @IsNotEmpty()
  @Validate(IsProfileImage)
  filename: string;
}
