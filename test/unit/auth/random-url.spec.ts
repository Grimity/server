import { createRandomUrl } from 'src/module/auth/random-url';
import { UrlValidator } from 'src/shared/request/validator';

describe('createRandomUrl', () => {
  it('회원가입 url 규칙을 항상 만족한다', () => {
    const validator = new UrlValidator();
    for (let i = 0; i < 1000; i++) {
      const url = createRandomUrl();
      expect(url).toMatch(/^user_[a-z0-9]{8}$/);
      expect(url.length).toBeGreaterThanOrEqual(2);
      expect(url.length).toBeLessThanOrEqual(20);
      expect(validator.validate(url)).toBe(true);
    }
  });

  it('매번 다른 값을 만든다', () => {
    const urls = new Set(Array.from({ length: 1000 }, createRandomUrl));
    expect(urls.size).toBe(1000);
  });
});
