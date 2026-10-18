import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  createCorsOptions,
  getAuthOrigins,
  getSessionCookieOptions,
} from 'src/common/config/auth.config';

describe('Web auth configuration', () => {
  it.each([
    ['https://www.grimity.com', 'https://www.grimity.com', true],
    ['https://board.grimity.com', 'https://board.grimity.com', true],
    ['http://localhost:3000', '*', false],
    ['https://untrusted.grimity.com', '*', false],
    [undefined, '*', false],
  ])(
    'preserves legacy CORS and limits credentials: %s',
    (origin, expectedOrigin, credentials) => {
      const vary = jest.fn();
      const callback = jest.fn();
      createCorsOptions(new ConfigService({}))(
        {
          get: () => origin,
          res: { vary },
        } as unknown as Request,
        callback,
      );
      expect(callback).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          origin: expectedOrigin,
          credentials,
        }),
      );
      expect(vary).toHaveBeenCalledWith('Origin');
    },
  );

  it('uses explicit production origins and secure, host-only cookies by default', () => {
    const config = new ConfigService({});
    expect(getAuthOrigins(config)).toEqual([
      'https://www.grimity.com',
      'https://board.grimity.com',
      'https://grimity.com',
    ]);
    expect(getSessionCookieOptions(config)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('accepts explicit development origins and local HTTP cookie configuration', () => {
    const config = new ConfigService({
      AUTH_ALLOWED_ORIGINS: 'http://localhost:3000, http://localhost:3001',
      AUTH_COOKIE_SECURE: 'false',
      NODE_ENV: 'development',
    });
    expect(getAuthOrigins(config)).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
    ]);
    expect(getSessionCookieOptions(config).secure).toBe(false);
  });

  it.each([
    '*',
    'null',
    'https://*.grimity.com',
    'https://www.grimity.com/',
    'https://www.grimity.com/path',
    'https://user:pass@grimity.com',
    '',
  ])('rejects unsafe or malformed origin configuration: %s', (origin) => {
    expect(() =>
      getAuthOrigins(new ConfigService({ AUTH_ALLOWED_ORIGINS: origin })),
    ).toThrow();
  });

  it('requires Secure for production and SameSite=None', () => {
    expect(() =>
      getSessionCookieOptions(
        new ConfigService({
          NODE_ENV: 'production',
          AUTH_COOKIE_SECURE: 'false',
        }),
      ),
    ).toThrow();
    expect(() =>
      getSessionCookieOptions(
        new ConfigService({
          AUTH_COOKIE_SAME_SITE: 'none',
          AUTH_COOKIE_SECURE: 'false',
        }),
      ),
    ).toThrow();
    expect(
      getSessionCookieOptions(
        new ConfigService({ AUTH_COOKIE_SAME_SITE: 'none' }),
      ).secure,
    ).toBe(true);
  });
});
