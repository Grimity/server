import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  Length,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsGalleryImage', async: false })
export class IsGalleryImage implements ValidatorConstraintInterface {
  validate(image: string) {
    return (
      typeof image === 'string' &&
      image.startsWith('gallery/') &&
      image.includes('.')
    );
  }

  defaultMessage() {
    return '이미지는 gallery/로 시작하고 확장자를 포함해야 합니다';
  }
}

@ValidatorConstraint({ name: 'IsGalleryTag', async: false })
export class IsGalleryTag implements ValidatorConstraintInterface {
  validate(tag: string) {
    return typeof tag === 'string' && tag.length <= 10 && tag.length > 0;
  }

  defaultMessage() {
    return '태그는 1글자 이상 10글자 이하여야 합니다';
  }
}

export class CreateGalleryDto {
  @ApiProperty({ description: '1글자이상 24글자 이하' })
  @IsString()
  @Length(1, 24)
  title: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    description: '이미지 파일명배열, 최소 1개, 최대 10개',
    example: ['gallery/{UUID}.jpg'],
  })
  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @Validate(IsGalleryImage, { each: true })
  images: string[];

  @ApiProperty()
  @IsBoolean()
  isAI: boolean;

  @ApiProperty({
    description: '0글자 이상 3000글자 이하, 0글자는 빈 문자열로 주세요',
  })
  @IsString()
  @Length(0, 3000)
  content: string;

  @ApiProperty({
    isArray: true,
    type: 'string',
    description:
      '태그, 없으면 빈 배열, 최대 8개, 각 태그는 1글자 이상 10글자 이하',
    example: ['태그1', '태그2'],
  })
  @IsString({ each: true })
  @ArrayMaxSize(8)
  @Validate(IsGalleryTag, { each: true })
  tags: string[];
}
