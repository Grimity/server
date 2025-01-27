import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsFeedCard', async: false })
export class IsFeedCard implements ValidatorConstraintInterface {
  validate(card: string) {
    return (
      typeof card === 'string' && card.startsWith('feed/') && card.includes('.')
    );
  }

  defaultMessage() {
    return '이미지는 feed/로 시작하고 확장자를 포함해야 합니다';
  }
}

@ValidatorConstraint({ name: 'IsFeedTag', async: false })
export class IsFeedTag implements ValidatorConstraintInterface {
  validate(tag: string) {
    return typeof tag === 'string' && tag.length <= 20 && tag.length > 0;
  }

  defaultMessage() {
    return '태그는 1글자 이상 20글자 이하여야 합니다';
  }
}
