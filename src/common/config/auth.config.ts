import { ConfigService } from '@nestjs/config';
import { CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';
import { CookieOptions, Request } from 'express';

export const WEB_SESSION_COOKIE = 'grimity_session';

export function getAuthOrigins(config: ConfigService): string[] {
  const origins = config
    .get<string>(
      'AUTH_ALLOWED_ORIGINS',
      'https://www.grimity.com,https://board.grimity.com,https://grimity.com',
    )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          origin.includes('*') ||
          !['http:', 'https:'].includes(url.protocol) ||
          url.origin !== origin
        );
      } catch {
        return true;
      }
    })
  ) {
    throw new Error(
      'AUTH_ALLOWED_ORIGINS must contain explicit HTTP(S) origins',
    );
  }
  return [...new Set(origins)];
}

export function createCorsOptions(
  config: ConfigService,
): CorsOptionsDelegate<Request> {
  const origins = getAuthOrigins(config);
  return (request, callback) => {
    const origin = request.get('Origin');
    const trusted = origins.includes(origin ?? '');
    // Preserve legacy non-credentialed clients on every origin. Only trusted
    // websites may read credentialed responses; cookie auth checks Origin too.
    request.res?.vary('Origin');
    callback(null, {
      origin: trusted ? origin : '*',
      credentials: trusted,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    });
  };
}

export function getSessionCookieOptions(config: ConfigService): CookieOptions {
  const secureValue = config.get<string>('AUTH_COOKIE_SECURE', 'true');
  if (!['true', 'false'].includes(secureValue)) {
    throw new Error('AUTH_COOKIE_SECURE must be true or false');
  }
  const secure = secureValue === 'true';
  const sameSite = config.get<string>('AUTH_COOKIE_SAME_SITE', 'lax');
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('AUTH_COOKIE_SAME_SITE must be lax, strict or none');
  }
  if (
    !secure &&
    (sameSite === 'none' || config.get('NODE_ENV') === 'production')
  ) {
    throw new Error(
      'Secure cookies are required in production and for SameSite=None',
    );
  }
  return {
    httpOnly: true,
    secure,
    sameSite: sameSite as 'lax' | 'strict' | 'none',
    // Both websites call the same API host; no parent-domain cookie is needed.
    path: '/',
  };
}
