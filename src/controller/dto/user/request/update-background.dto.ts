import { ApiProperty } from '@nestjs/swagger';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsBackgroundImage', async: false })
export class IsBackgroundImage implements ValidatorConstraintInterface {
  validate(image: string) {
    return (
      typeof image === 'string' &&
      image.startsWith('background/') &&
      image.includes('.')
    );
  }

  defaultMessage() {
    return '이미지는 background/로 시작하고 확장자를 포함해야 합니다';
  }
}

export class UpdateBackgroundImageDto {
  @ApiProperty({ example: 'background/{UUID}.jpg' })
  @Validate(IsBackgroundImage)
  imageName: string;
}
