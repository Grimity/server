import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHmac, randomUUID } from 'crypto';
import { CookieOptions, Request, Response } from 'express';
import {
  getAuthOrigins,
  getSessionCookieOptions,
  WEB_SESSION_COOKIE,
} from 'src/common/config/auth.config';
import { UserWriter } from '../user/repository/user.writer';
import { ClientInfo } from 'src/shared/types/client-info';
import { readClientInfo } from 'src/core/middleware/client-info.middleware';

export type WebSession = {
  userId: string;
  sessionId: string;
  token: string;
  expiresAt: Date;
};

type SessionPayload = {
  id: string;
  sessionId: string;
  purpose: 'web-session';
  exp: number;
  iat: number;
};

@Injectable()
export class WebSessionService {
  private readonly secret: string;
  private readonly expiresIn: JwtSignOptions['expiresIn'];
  private readonly origins: string[];
  private readonly cookieOptions: CookieOptions;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
    private readonly writer: UserWriter,
  ) {
    // Domain separation prevents a cookie JWT from being used as an access or
    // legacy refresh token, even when deployments reuse their JWT secrets.
    this.secret = createHmac(
      'sha256',
      config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    )
      .update('grimity:web-session:v1')
      .digest('hex');
    this.expiresIn = config.getOrThrow<JwtSignOptions['expiresIn']>(
      'JWT_REFRESH_EXPIRES_IN',
    );
    this.origins = getAuthOrigins(config);
    this.cookieOptions = getSessionCookieOptions(config);
  }

  isBrowserRequest(request: Request): boolean {
    return (
      request.clientInfo?.type === 'WEB' &&
      this.origins.includes(request.get('Origin') ?? '')
    );
  }

  async authenticateRequest(request: Request): Promise<WebSession> {
    const token = this.readCookie(request);
    // Missing credentials keep the existing 401, including native clients.
    if (!token) throw new UnauthorizedException();
    request.clientInfo ??= readClientInfo(request);
    if (!request.clientInfo || !this.isBrowserRequest(request)) {
      throw new ForbiddenException(
        'A trusted web origin is required for cookie authentication',
      );
    }
    return this.restore(token, request.clientInfo);
  }

  readCookie(request: Request): string | undefined {
    const values = (request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${WEB_SESSION_COOKIE}=`));
    // Reject ambiguous same-name cookies instead of choosing an attacker-
    // controlled parent-domain cookie over the host-only cookie.
    if (values.length !== 1) return undefined;
    try {
      return decodeURIComponent(values[0].slice(WEB_SESSION_COOKIE.length + 1));
    } catch {
      return undefined;
    }
  }

  private key(sessionId: string): string {
    return `web-session:${sessionId}`;
  }

  private issue(userId: string, sessionId: string): WebSession {
    const token = this.jwt.sign(
      { id: userId, sessionId, purpose: 'web-session' },
      { secret: this.secret, algorithm: 'HS256', expiresIn: this.expiresIn },
    );
    const payload = this.jwt.decode<SessionPayload>(token);
    if (!payload.exp || payload.exp <= payload.iat) {
      throw new Error('JWT_REFRESH_EXPIRES_IN must be a positive duration');
    }
    return {
      userId,
      sessionId,
      token,
      expiresAt: new Date(payload.exp * 1000),
    };
  }

  private decode(
    token?: string,
    ignoreExpiration = false,
  ): SessionPayload | null {
    if (!token) return null;
    try {
      const payload = this.jwt.verify<SessionPayload>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
        ignoreExpiration,
      });
      if (
        payload.purpose !== 'web-session' ||
        typeof payload.id !== 'string' ||
        typeof payload.sessionId !== 'string' ||
        !/^[0-9a-f-]{36}$/.test(payload.sessionId) ||
        !Number.isFinite(payload.exp)
      )
        return null;
      return payload;
    } catch {
      return null;
    }
  }

  async create(userId: string, client: ClientInfo): Promise<WebSession> {
    const session = this.issue(userId, randomUUID());
    await this.writer.createRefreshToken({
      ...client,
      userId,
      refreshToken: this.key(session.sessionId),
      deviceId: null,
    });
    return session;
  }

  async renew(
    userId: string,
    sessionId: string,
    client: ClientInfo,
  ): Promise<WebSession> {
    const session = this.issue(userId, sessionId);
    const payload = this.jwt.decode<SessionPayload>(session.token);
    const cutoff = new Date(Date.now() - (payload.exp - payload.iat) * 1000);
    // A conditional update cannot recreate a session deleted by logout.
    const touched = await this.writer.touchWebSession(
      userId,
      this.key(sessionId),
      client,
      cutoff,
    );
    if (!touched) throw new UnauthorizedException('Expired web session');
    return session;
  }

  async restore(
    token: string | undefined,
    client: ClientInfo,
  ): Promise<WebSession> {
    const payload = this.decode(token);
    if (!payload) throw new UnauthorizedException('Invalid web session');
    return this.renew(payload.id, payload.sessionId, client);
  }

  belongsToUser(token: string | undefined, userId: string): boolean {
    return this.decode(token, true)?.id === userId;
  }

  async revoke(userId: string, sessionId: string) {
    await this.writer.deleteRefreshToken(userId, this.key(sessionId));
  }

  async revokeCookie(token: string | undefined) {
    // Expired cookies can still identify a session to revoke on logout.
    const payload = this.decode(token, true);
    if (payload) await this.revoke(payload.id, payload.sessionId);
  }

  writeCookie(response: Response, session: WebSession) {
    response.cookie(WEB_SESSION_COOKIE, session.token, {
      ...this.cookieOptions,
      expires: session.expiresAt,
      maxAge: Math.max(0, session.expiresAt.getTime() - Date.now()),
    });
  }

  clearCookie(response: Response) {
    response.clearCookie(WEB_SESSION_COOKIE, this.cookieOptions);
  }
}
