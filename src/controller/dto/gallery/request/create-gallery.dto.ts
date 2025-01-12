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
  @IsString()
  @Length(1, 24)
  title: string;

  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @Validate(IsGalleryImage, { each: true })
  images: string[];

  @IsBoolean()
  isAI: boolean;

  @IsString()
  @Length(0, 3000)
  content: string;

  @IsString({ each: true })
  @ArrayMaxSize(8)
  @Validate(IsGalleryTag, { each: true })
  tags: string[];
}
