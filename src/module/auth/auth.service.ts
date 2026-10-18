import { Injectable, HttpException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserWriter } from '../user/repository/user.writer';
import { UserReader } from '../user/repository/user.reader';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { ClientInfo } from 'src/shared/types/client-info';
import {
  googleBanList,
  kakaoBanList,
} from 'src/common/constants/ban-list.constant';
import { WebSession, WebSessionService } from './web-session.service';
import { RefreshTokenPayload } from './types/refresh-token';

@Injectable()
export class AuthService {
  constructor(
    private userWriter: UserWriter,
    private jwtService: JwtService,
    private userReader: UserReader,
    private configService: ConfigService,
    private webSessions: WebSessionService,
  ) {}

  async login(
    input: LoginInput,
    clientInfo: ClientInfo,
    withWebSession = false,
  ) {
    let providerId;

    if (input.provider === 'GOOGLE') {
      const googleProfile = await this.getGoogleProfile(
        input.providerAccessToken,
      );
      providerId = googleProfile.id;
    } else if (input.provider === 'APPLE') {
      const appleProfile = await this.getAppleProfile(
        input.providerAccessToken,
      );
      providerId = appleProfile.sub;
    } else {
      const kakaoProfile = await this.getKakaoProfile(
        input.providerAccessToken,
      );
      providerId = kakaoProfile.kakaoId;
    }

    const user = await this.userReader.findOneByProvider(
      input.provider,
      providerId,
    );

    if (user === null) {
      throw new HttpException('USER', 404);
    }

    const session = withWebSession
      ? await this.webSessions.create(user.id, clientInfo)
      : undefined;
    return this.issueTokens(user.id, clientInfo, input.deviceId, session);
  }

  async register(
    input: RegisterInput,
    clientInfo: ClientInfo,
    withWebSession = false,
  ) {
    let providerId;
    let email;
    if (input.provider === 'GOOGLE') {
      const googleProfile = await this.getGoogleProfile(
        input.providerAccessToken,
      );
      if (googleBanList.includes(googleProfile.id))
        throw new Error(`벤이다 이녀석아 ${googleProfile.id}`);

      providerId = googleProfile.id;
      email = googleProfile.email;
    } else if (input.provider === 'APPLE') {
      const appleProfile = await this.getAppleProfile(
        input.providerAccessToken,
      );
      providerId = appleProfile.sub;
      email = appleProfile.email || '';
    } else {
      const kakaoProfile = await this.getKakaoProfile(
        input.providerAccessToken,
      );
      if (kakaoBanList.includes(kakaoProfile.kakaoId))
        throw new Error(`벤이다 이녀석아 ${kakaoProfile.kakaoId}`);

      providerId = kakaoProfile.kakaoId;
      email = kakaoProfile.email;
    }

    const [urlConflictUser, nameConflictUser] = await Promise.all([
      this.userReader.findOneByUrl(input.url),
      this.userReader.findOneByName(input.name),
    ]);

    if (nameConflictUser !== null) throw new HttpException('NAME', 409);
    if (urlConflictUser !== null) throw new HttpException('URL', 409);

    const user = await this.userWriter.create({
      provider: input.provider,
      providerId,
      email,
      name: input.name,
      url: input.url,
    });

    const session = withWebSession
      ? await this.webSessions.create(user.id, clientInfo)
      : undefined;
    return this.issueTokens(user.id, clientInfo, input.deviceId, session);
  }

  async refresh(
    userId: string,
    token: string,
    clientInfo: ClientInfo,
    withWebSession = false,
  ) {
    const savedToken = await this.userReader.findRefreshToken(userId, token);
    if (!savedToken) {
      throw new HttpException('만료된 refT', 401);
    }

    const { sessionId } = this.jwtService.decode<RefreshTokenPayload>(token);
    const session = sessionId
      ? await this.webSessions.renew(userId, sessionId, clientInfo)
      : withWebSession
        ? await this.webSessions.create(userId, clientInfo)
        : undefined;
    const accessToken = this.jwtService.sign({ id: userId });
    const refreshToken = this.signRefreshToken(
      userId,
      clientInfo,
      session?.sessionId,
    );

    const result = await this.userWriter.updateRefreshToken(
      userId,
      token,
      refreshToken,
    );
    if (result === null) {
      if (!sessionId && session)
        await this.webSessions.revoke(userId, session.sessionId);
      throw new HttpException('만료된 refT', 401);
    }

    return {
      accessToken,
      refreshToken,
      webSession: withWebSession ? session : undefined,
    };
  }

  private signRefreshToken(
    userId: string,
    clientInfo: ClientInfo,
    sessionId?: string,
  ) {
    return this.jwtService.sign(
      {
        id: userId,
        type: clientInfo.type,
        device: clientInfo.device,
        model: clientInfo.model,
        // Login / refresh requests in the same second must issue distinct tokens.
        jti: randomUUID(),
        ...(sessionId ? { sessionId } : {}),
      },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );
  }

  private async issueTokens(
    userId: string,
    clientInfo: ClientInfo,
    deviceId?: string,
    webSession?: WebSession,
  ) {
    const accessToken = this.jwtService.sign({ id: userId });
    const refreshToken = this.signRefreshToken(
      userId,
      clientInfo,
      webSession?.sessionId,
    );
    await this.userWriter.createRefreshToken({
      ...clientInfo,
      userId,
      refreshToken,
      deviceId: deviceId ?? null,
    });
    return { id: userId, accessToken, refreshToken, webSession };
  }

  async refreshSession(session: WebSession, clientInfo: ClientInfo) {
    // Each website gets its own rotating header refresh token. The shared
    // session identifier stays valid across concurrent restores and rotations.
    const { id: _id, ...tokens } = await this.issueTokens(
      session.userId,
      clientInfo,
      undefined,
      session,
    );
    return tokens;
  }

  async logout(userId: string, token: string, clientInfo: ClientInfo) {
    const result = await this.userWriter.deleteRefreshToken(userId, token);
    if (result === null) throw new HttpException('만료된 refT', 401);

    const { sessionId } = this.jwtService.decode<RefreshTokenPayload>(token);
    if (sessionId) await this.webSessions.revoke(userId, sessionId);

    return;
  }

  async getKakaoProfile(kakaoAccessToken: string) {
    const result = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${kakaoAccessToken}`,
      },
    });
    const data = (await result.json()) as KakaoProfile;

    if (result.status !== 200 || !data.id || !data.kakao_account.email) {
      throw new HttpException('Invalid access token', 401);
    }

    return {
      kakaoId: data.id.toString(),
      email: data.kakao_account.email,
    };
  }

  async getGoogleProfile(accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`,
    );
    const data = (await response.json()) as GoogleProfile;
    if (!data.id) {
      throw new HttpException('Invalid access token', 401);
    }
    return data;
  }

  async getAppleProfile(appleJwt: string) {
    const data = this.jwtService.decode(appleJwt) as AppleProfile;

    return data;
  }
}

export type AppleProfile = {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  c_hash: string;
  email?: string;
  email_verified: string;
  is_private_email: string;
  auth_time: number;
};

export type KakaoProfile = {
  id: number;
  connected_at: string;
  kakao_account: {
    profile_nickname_needs_agreement: boolean;
    profile: {
      nickname: string;
    };
    has_email: boolean;
    email_needs_agreement: boolean;
    is_email_valid: boolean;
    is_email_verified: boolean;
    email: string;
  };
};

export type GoogleProfile = {
  id: string;
  email: string;
  verified_email: boolean;
  picture: string;
};

export type LoginInput = {
  provider: string;
  providerAccessToken: string;
  deviceId?: string;
};

export type RegisterInput = {
  provider: string;
  providerAccessToken: string;
  name: string;
  url: string;
  deviceId?: string;
};
