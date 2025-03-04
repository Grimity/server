import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';

export function TrimString() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  });
}

export function TrimAndLowerNullableString() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return null;
    }

    return value.trim().toLowerCase();
  });
}

@ValidatorConstraint()
class ImageValidator implements ValidatorConstraintInterface {
  validate(image: string, args: ValidationArguments) {
    const [prefix] = args.constraints;
    return (
      typeof image === 'string' &&
      image.startsWith(prefix) &&
      image.includes('.')
    );
  }

  defaultMessage(args: ValidationArguments) {
    const [prefix] = args.constraints;
    return `이미지는 ${prefix}로 시작하고 확장자를 포함해야 합니다`;
  }
}

export function IsImageWithPrefix(
  prefix: string, // prefix를 인자로 받음
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [prefix], // constraints에 prefix 전달
      validator: ImageValidator, // 커스텀 유효성 검증기 지정
    });
  };
}

@ValidatorConstraint()
export class TagValidator implements ValidatorConstraintInterface {
  validate(tag: string) {
    return (
      typeof tag === 'string' &&
      tag.trim().length <= 20 &&
      tag.trim().length > 0
    );
  }

  defaultMessage() {
    return '태그는 1글자 이상 20글자 이하여야 합니다';
  }
}
