import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import {
  createCorsOptions,
  WEB_SESSION_COOKIE,
} from 'src/common/config/auth.config';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { AuthService } from 'src/module/auth/auth.service';
import { PushService } from 'src/module/push/push.service';

const WWW = 'https://www.grimity.com';
const BOARD = 'https://board.grimity.com';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

describe('Shared web session (legacy header auth compatibility)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: ConfigService;
  let auth: AuthService;
  let userId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PushService)
      .useValue({ pushNotification: jest.fn() })
      .compile();
    app = module.createNestApplication();
    prisma = module.get(PrismaService);
    jwt = module.get(JwtService);
    config = module.get(ConfigService);
    auth = module.get(AuthService);
    app.enableCors(createCorsOptions(config));
    jest.spyOn(auth, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'web-session-test',
      email: 'web-session@test.com',
    });
    await app.init();
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'web-session-test',
        name: 'web-session-test',
        url: 'web-session-test',
        email: 'web-session@test.com',
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  function login(origin?: string, cookie?: string) {
    const call = request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', UA);
    if (origin) call.set('Origin', origin);
    if (cookie) call.set('Cookie', cookie);
    return call.send({
      provider: 'kakao',
      providerAccessToken: 'mock-provider-token',
    });
  }

  function cookieOf(response: request.Response): string {
    return (response.headers['set-cookie'] as unknown as string[])[0].split(
      ';',
    )[0];
  }

  function restore(cookie?: string, origin = BOARD) {
    const call = request(app.getHttpServer())
      .get('/auth/refresh')
      .set('User-Agent', UA)
      .set('Origin', origin);
    if (cookie) call.set('Cookie', cookie);
    return call;
  }

  function refresh(token: string, cookie?: string, origin?: string) {
    const call = request(app.getHttpServer())
      .get('/auth/refresh')
      .set('User-Agent', UA)
      .set('Authorization', `Bearer ${token}`);
    if (cookie) call.set('Cookie', cookie);
    if (origin) call.set('Origin', origin);
    return call;
  }

  it('keeps existing browsers working through repeated refreshes without sending cookies', async () => {
    const loggedIn = await login(WWW).expect(200);
    const first = await refresh(
      loggedIn.body.refreshToken,
      undefined,
      WWW,
    ).expect(200);
    const second = await refresh(
      first.body.refreshToken,
      undefined,
      WWW,
    ).expect(200);
    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${second.body.accessToken}`)
      .expect(200);
    expect(me.body.id).toBe(userId);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', WWW)
      .set('User-Agent', UA)
      .set('Authorization', `Bearer ${second.body.refreshToken}`)
      .expect(204);
  });

  it('authenticates existing read and write APIs with only the shared cookie', async () => {
    const loggedIn = await login(WWW).expect(200);
    const cookie = cookieOf(loggedIn);
    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Origin', BOARD)
      .set('User-Agent', UA)
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.id).toBe(userId);
    expect(me.headers['cache-control']).toContain('no-store');
    expect(me.headers.vary).toContain('Cookie');
    await request(app.getHttpServer())
      .put('/me')
      .set('Origin', BOARD)
      .set('User-Agent', UA)
      .set('Cookie', cookie)
      .send({
        name: 'updated-user',
        url: 'updated_user',
        description: 'updated via cookie',
        links: [],
      })
      .expect(204);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: userId } }))
        .description,
    ).toBe('updated via cookie');
  });

  it('does not fall back to a valid cookie on missing Bearer values, malformed, expired or revoked headers', async () => {
    const loggedIn = await login(WWW).expect(200);
    const cookie = cookieOf(loggedIn);
    const expiredAccess = jwt.sign({ id: userId }, { expiresIn: -1 });
    const expiredRefresh = jwt.sign(
      { id: userId, type: 'WEB', device: 'desktop', model: 'macOS Chrome' },
      {
        secret: config.get('JWT_REFRESH_SECRET'),
        expiresIn: -1,
      },
    );
    for (const header of [
      '',
      'Bearer',
      'Basic bad',
      'Bearer broken',
      `Bearer ${expiredAccess}`,
    ]) {
      const rejected = await request(app.getHttpServer())
        .get('/me')
        .set('Origin', WWW)
        .set('User-Agent', UA)
        .set('Cookie', cookie)
        .set('Authorization', header)
        .expect(401);
      expect(rejected.headers['set-cookie']).toBeUndefined();
    }
    const rotated = await refresh(
      loggedIn.body.refreshToken,
      cookie,
      WWW,
    ).expect(200);
    for (const [method, path] of [
      ['get', '/auth/refresh'],
      ['post', '/auth/logout'],
    ] as const) {
      for (const header of [
        '',
        'Bearer',
        'Basic bad',
        'Bearer broken',
        `Bearer ${expiredRefresh}`,
        `Bearer ${loggedIn.body.refreshToken}`,
      ]) {
        const rejected = await request(app.getHttpServer())
          [method](path)
          .set('Origin', WWW)
          .set('User-Agent', UA)
          .set('Cookie', cookie)
          .set('Authorization', header)
          .expect(401);
        expect(rejected.headers['set-cookie']).toBeUndefined();
      }
    }
    await restore(cookie).expect(200);
    await refresh(rotated.body.refreshToken).expect(200);
  });

  it('keeps optional-auth behavior and never falls back from an invalid header to a cookie', async () => {
    const loggedIn = await login(WWW).expect(200);
    const target = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'target',
        name: 'target',
        url: 'target',
        email: 'target@test.com',
      },
    });
    await prisma.follow.create({
      data: { followerId: userId, followingId: target.id },
    });
    const profile = (header?: string, cookie?: string) => {
      const call = request(app.getHttpServer())
        .get(`/users/${target.id}`)
        .set('Origin', BOARD)
        .set('User-Agent', UA);
      if (header !== undefined) call.set('Authorization', header);
      if (cookie) call.set('Cookie', cookie);
      return call;
    };
    expect(
      (await profile(undefined, cookieOf(loggedIn)).expect(200)).body
        .isFollowing,
    ).toBe(true);
    const otherAccountHeader = jwt.sign({ id: target.id });
    expect(
      (
        await profile(
          `Bearer ${otherAccountHeader}`,
          cookieOf(loggedIn),
        ).expect(200)
      ).body.isFollowing,
    ).toBe(false);
    for (const header of [
      '',
      'Basic bad',
      'Bearer invalid',
      `Bearer ${jwt.sign({ id: userId }, { expiresIn: -1 })}`,
    ]) {
      expect(
        (await profile(header, cookieOf(loggedIn)).expect(200)).body
          .isFollowing,
      ).toBe(false);
    }
    expect((await profile().expect(200)).body.isFollowing).toBe(false);
    expect(
      (await profile(undefined, `${WEB_SESSION_COOKIE}=invalid`).expect(200))
        .body.isFollowing,
    ).toBe(false);
  });

  it('removes the separate session endpoints', async () => {
    await request(app.getHttpServer()).post('/auth/session').expect(404);
    await request(app.getHttpServer()).delete('/auth/session').expect(404);
  });

  it('preserves header-only login and refresh JSON without issuing a cookie', async () => {
    const response = await login().expect(200);
    expect(response.body).toEqual({
      id: userId,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    expect(response.headers['set-cookie']).toBeUndefined();
    const renewed = await refresh(response.body.refreshToken).expect(200);
    expect(renewed.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    expect(renewed.body.refreshToken).not.toBe(response.body.refreshToken);
    expect(await prisma.refreshToken.count()).toBe(1);
  });

  it('keeps native app login, refresh and logout header-based', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('grimity-app-device', 'mobile')
      .set('grimity-app-model', 'iPhone 12')
      .send({
        provider: 'kakao',
        providerAccessToken: 'mock',
        deviceId: 'native-device',
      })
      .expect(200);
    expect(response.headers['set-cookie']).toBeUndefined();
    const renewed = await request(app.getHttpServer())
      .get('/auth/refresh')
      .set('grimity-app-device', 'mobile')
      .set('grimity-app-model', 'iPhone 12')
      .set('Authorization', `Bearer ${response.body.refreshToken}`)
      .expect(200);
    expect(renewed.headers['set-cookie']).toBeUndefined();
    expect((await prisma.refreshToken.findFirst())?.deviceId).toBe(
      'native-device',
    );
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('grimity-app-device', 'mobile')
      .set('grimity-app-model', 'iPhone 12')
      .set('Authorization', `Bearer ${renewed.body.refreshToken}`)
      .expect(204);
    expect(await prisma.refreshToken.count()).toBe(0);
  });

  it('adds an HttpOnly host-only cookie while preserving the login body', async () => {
    const response = await login(WWW).expect(200);
    expect(response.body).toEqual({
      id: userId,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toContain(`${WEB_SESSION_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/;');
    expect(cookie).not.toContain('Domain=');
    expect(cookieOf(response)).not.toContain(response.body.refreshToken);
    expect(response.headers['cache-control']).toContain('no-store');
    const restored = await restore(cookieOf(response)).expect(200);
    expect(jwt.decode<{ id: string }>(restored.body.accessToken).id).toBe(
      userId,
    );
    expect(restored.body.refreshToken).not.toBe(response.body.refreshToken);
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${restored.body.accessToken}`)
      .expect(200);
  });

  it('issues a cookie on browser registration without changing the response contract', async () => {
    await prisma.user.deleteMany();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .set('Origin', WWW)
      .set('User-Agent', UA)
      .send({
        provider: 'kakao',
        providerAccessToken: 'mock',
        name: 'new-user',
        url: 'new_user',
      })
      .expect(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    await restore(cookieOf(response)).expect(200);
  });

  it('upgrades a pre-existing refresh token without a sessionId during refresh', async () => {
    const oldToken = jwt.sign(
      { id: userId, type: 'WEB', device: 'desktop', model: 'macOS Chrome' },
      {
        secret: config.get('JWT_REFRESH_SECRET'),
        expiresIn: config.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );
    await prisma.refreshToken.create({
      data: {
        userId,
        token: oldToken,
        type: 'WEB',
        device: 'desktop',
        model: 'macOS Chrome',
        ip: '127.0.0.1',
      },
    });
    const upgraded = await refresh(oldToken, undefined, WWW).expect(200);
    expect(upgraded.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    const restored = await restore(cookieOf(upgraded)).expect(200);
    expect(jwt.decode<{ id: string }>(restored.body.accessToken).id).toBe(
      userId,
    );
    await refresh(oldToken).expect(401);
  });

  it('handles concurrent cookie restores and independent website refreshes', async () => {
    const www = await login(WWW).expect(200);
    const cookie = cookieOf(www);
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => restore(cookie)),
    );
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200, 200,
    ]);
    expect(
      new Set(responses.map((response) => response.body.refreshToken)).size,
    ).toBe(4);
    const renewed = await Promise.all([
      refresh(www.body.refreshToken, cookie, WWW),
      refresh(responses[0].body.refreshToken, cookie, BOARD),
      restore(cookie),
    ]);
    expect(renewed.map((response) => response.status)).toEqual([200, 200, 200]);
    // An earlier cookie still references the same live session after renewal.
    await restore(cookie).expect(200);
    await refresh(renewed[0].body.refreshToken).expect(200);
  });

  it('revokes both websites on header logout, without logging out other browsers', async () => {
    const www = await login(WWW).expect(200);
    const board = await restore(cookieOf(www)).expect(200);
    const otherBrowser = await login(WWW).expect(200);
    const loggedOut = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', WWW)
      .set('User-Agent', UA)
      .set('Cookie', cookieOf(www))
      .set('Authorization', `Bearer ${www.body.refreshToken}`)
      .expect(204);
    expect(loggedOut.headers['set-cookie'][0]).toContain(
      'Expires=Thu, 01 Jan 1970',
    );
    await restore(cookieOf(www)).expect(401);
    await refresh(board.body.refreshToken).expect(401);
    await restore(cookieOf(otherBrowser)).expect(200);
  });

  it('supports cookie-only logout on the existing route and prevents session resurrection', async () => {
    const loggedIn = await login(WWW).expect(200);
    const cookie = cookieOf(loggedIn);
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', BOARD)
      .set('User-Agent', UA)
      .set('Cookie', cookie)
      .expect(204);
    expect(response.headers['set-cookie'][0]).toContain(
      'Expires=Thu, 01 Jan 1970',
    );
    expect(response.headers['set-cookie'][0]).toContain('Path=/;');
    await refresh(loggedIn.body.refreshToken, cookie, WWW).expect(401);
    await restore(cookie).expect(401);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', WWW)
      .expect(401);
  });

  it('uses header account A over cookie account B for reads, refresh and logout', async () => {
    const accountA = await login(WWW).expect(200);
    const second = await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'second-user',
        name: 'second-user',
        url: 'second-user',
        email: 'second@test.com',
      },
    });
    const spy = jest.spyOn(auth, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'second-user',
      email: 'second@test.com',
    });
    let accountB: request.Response;
    try {
      accountB = await login(BOARD).expect(200);
    } finally {
      spy.mockResolvedValue({
        kakaoId: 'web-session-test',
        email: 'web-session@test.com',
      });
    }
    const cookieB = cookieOf(accountB);
    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Origin', WWW)
      .set('User-Agent', UA)
      .set('Cookie', cookieB)
      .set('Authorization', `Bearer ${accountA.body.accessToken}`)
      .expect(200);
    expect(me.body.id).toBe(userId);
    const renewed = await refresh(
      accountA.body.refreshToken,
      cookieB,
      WWW,
    ).expect(200);
    expect(jwt.decode<{ id: string }>(renewed.body.accessToken).id).toBe(
      userId,
    );
    const cookieA = await restore(cookieOf(renewed)).expect(200);
    expect(jwt.decode<{ id: string }>(cookieA.body.accessToken).id).toBe(
      userId,
    );
    const loggedOut = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Origin', WWW)
      .set('User-Agent', UA)
      .set('Cookie', cookieB)
      .set('Authorization', `Bearer ${renewed.body.refreshToken}`)
      .expect(204);
    expect(loggedOut.headers['set-cookie']).toBeUndefined();
    const stillB = await restore(cookieB).expect(200);
    expect(jwt.decode<{ id: string }>(stillB.body.accessToken).id).toBe(
      second.id,
    );
    await restore(cookieOf(accountA)).expect(401);
  });

  it('revokes the old shared session when explicitly logging in to another account', async () => {
    const oldAccount = await login(WWW).expect(200);
    await prisma.user.create({
      data: {
        provider: 'KAKAO',
        providerId: 'second-user',
        name: 'second-user',
        url: 'second-user',
        email: 'second@test.com',
      },
    });
    const spy = jest.spyOn(auth, 'getKakaoProfile').mockResolvedValue({
      kakaoId: 'second-user',
      email: 'second@test.com',
    });
    try {
      const newAccount = await login(BOARD, cookieOf(oldAccount)).expect(200);
      await restore(cookieOf(oldAccount)).expect(401);
      await refresh(oldAccount.body.refreshToken).expect(401);
      await restore(cookieOf(newAccount)).expect(200);
    } finally {
      spy.mockResolvedValue({
        kakaoId: 'web-session-test',
        email: 'web-session@test.com',
      });
    }
  });

  it.each([
    undefined,
    'null',
    'https://evil.example',
    'https://www.grimity.com.evil.example',
    'https://untrusted.grimity.com',
  ])(
    'rejects cookie requests from an untrusted/missing Origin: %s',
    async (origin) => {
      const loggedIn = await login(WWW).expect(200);
      for (const [method, path] of [
        ['get', '/auth/refresh'],
        ['post', '/auth/logout'],
        ['get', '/me'],
        ['put', '/me'],
      ] as const) {
        const call = request(app.getHttpServer())
          [method](path)
          .set('User-Agent', UA)
          .set('Cookie', cookieOf(loggedIn));
        if (origin) call.set('Origin', origin);
        const response = await call.expect(403);
        expect(response.headers['set-cookie']).toBeUndefined();
        expect(response.headers['cache-control']).toContain('no-store');
      }
      await restore(cookieOf(loggedIn)).expect(200);
    },
  );

  it('preserves legacy login on other origins without issuing or modifying cookies', async () => {
    const trusted = await login(WWW).expect(200);
    const response = await login(
      'http://localhost:3000',
      cookieOf(trusted),
    ).expect(200);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
    await restore(cookieOf(trusted)).expect(200);
    await refresh(
      response.body.refreshToken,
      cookieOf(trusted),
      'http://localhost:3000',
    ).expect(200);
  });

  it('rejects absent, malformed, tampered, duplicate and wrong-purpose cookies', async () => {
    const loggedIn = await login(WWW).expect(200);
    const cookie = cookieOf(loggedIn);
    for (const invalid of [
      undefined,
      `${WEB_SESSION_COOKIE}=%ZZ`,
      `${cookie}tampered`,
      `${cookie}; ${cookie}`,
      `${WEB_SESSION_COOKIE}=${loggedIn.body.refreshToken}`,
    ]) {
      await restore(invalid).expect(401);
    }
    const cookieToken = decodeURIComponent(
      cookie.slice(cookie.indexOf('=') + 1),
    );
    await refresh(cookieToken).expect(401);
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${cookieToken}`)
      .expect(401);
  });

  it('rejects expired cookies and expired DB sessions', async () => {
    const loggedIn = await login(WWW).expect(200);
    const cookie = cookieOf(loggedIn);
    const original = jwt.decode<{ id: string; sessionId: string }>(
      decodeURIComponent(cookie.split('=')[1]),
    );
    const secret = createHmac(
      'sha256',
      config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    )
      .update('grimity:web-session:v1')
      .digest('hex');
    const expired = jwt.sign(
      {
        id: original.id,
        sessionId: original.sessionId,
        purpose: 'web-session',
      },
      { secret, expiresIn: -1 },
    );
    await restore(`${WEB_SESSION_COOKIE}=${expired}`).expect(401);
    await prisma.refreshToken.updateMany({
      where: { token: { startsWith: 'web-session:' } },
      data: { updatedAt: new Date(0) },
    });
    await restore(cookie).expect(401);
    await refresh(loggedIn.body.refreshToken).expect(401);
  });

  it('does not accept a session from another client type or browser model', async () => {
    const loggedIn = await login(WWW).expect(200);
    await request(app.getHttpServer())
      .get('/auth/refresh')
      .set('Origin', BOARD)
      .set('grimity-app-device', 'mobile')
      .set('grimity-app-model', 'iPhone 12')
      .set('Cookie', cookieOf(loggedIn))
      .expect(403);
    await request(app.getHttpServer())
      .get('/auth/refresh')
      .set('Origin', BOARD)
      .set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      )
      .set('Cookie', cookieOf(loggedIn))
      .expect(401);
  });

  it('returns explicit credentialed CORS headers for both websites', async () => {
    for (const origin of [WWW, BOARD]) {
      const preflight = await request(app.getHttpServer())
        .options('/auth/refresh')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type,authorization')
        .expect(204);
      expect(preflight.headers['access-control-allow-origin']).toBe(origin);
      expect(preflight.headers['access-control-allow-credentials']).toBe(
        'true',
      );
      expect(preflight.headers.vary).toContain('Origin');
      const response = await login(origin).expect(200);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
    }
    const rejected = await request(app.getHttpServer())
      .options('/auth/refresh')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(rejected.headers['access-control-allow-origin']).toBe('*');
    expect(
      rejected.headers['access-control-allow-credentials'],
    ).toBeUndefined();
    expect(rejected.headers.vary).toContain('Origin');
  });
});
