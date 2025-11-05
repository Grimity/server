import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { forbiddenUrls } from '../../common/constants/forbidden-url.constant';

export function TrimString() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  });
}

export function TrimNullableString() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return null;
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

export function TrimAndUpperNullableString() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return null;
    }

    return value.trim().toUpperCase();
  });
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

@ValidatorConstraint()
export class UrlValidator implements ValidatorConstraintInterface {
  validate(id: string) {
    if (forbiddenUrls.includes(id)) return false;

    const regex = /^[a-z0-9_]+$/;
    return regex.test(id);
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return '숫자, 영문소문자, _ 로만 구성되어야합니다';
  }
}
