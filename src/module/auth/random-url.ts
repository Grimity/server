import { randomInt } from 'crypto';

const PREFIX = 'user_';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const LENGTH = 8;

/**
 * 회원가입에서 url을 보내지 않았을 때 쓰는 프로필 url.
 * UrlValidator 규칙(소문자·숫자·_, 2~20자, 금지어 제외)을 항상 만족하고,
 * 36^8(약 2.8조) 가지라 겹칠 일은 드물다. 겹치면 호출한 쪽에서 다시 만든다.
 */
export function createRandomUrl(): string {
  let suffix = '';
  for (let i = 0; i < LENGTH; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return PREFIX + suffix;
}
