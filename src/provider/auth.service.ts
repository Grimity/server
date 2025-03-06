import { Injectable, HttpException, Inject } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { UserSelectRepository } from 'src/repository/user.select.repository';
import { JwtService } from '@nestjs/jwt';
import { SearchService } from 'src/database/search/search.service';
import { ConfigService } from '@nestjs/config';
import { ClientInfo } from 'src/types';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private userSelectRepository: UserSelectRepository,
    @Inject(SearchService) private searchService: SearchService,
    private configService: ConfigService,
  ) {}

  async login(input: LoginInput, clientInfo: ClientInfo) {
    let providerId;

    if (input.provider === 'GOOGLE') {
      const googleProfile = await this.getGoogleProfile(
        input.providerAccessToken,
      );
      providerId = googleProfile.id;
    } else {
      const kakaoProfile = await this.getKakaoProfile(
        input.providerAccessToken,
      );
      providerId = kakaoProfile.kakaoId;
    }

    const user = await this.userSelectRepository.findOneByProviderOrThrow(
      input.provider,
      providerId,
    );

    const accessToken = this.jwtService.sign({ id: user.id });
    const refreshToken = this.jwtService.sign(
      {
        id: user.id,
        type: clientInfo.type,
        device: clientInfo.device,
        model: `${clientInfo.os} ${clientInfo.browser}`,
      },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    await this.userRepository.createRefreshToken({
      userId: user.id,
      refreshToken,
      type: clientInfo.type,
      device: clientInfo.device,
      model: `${clientInfo.os} ${clientInfo.browser}`,
      ip: clientInfo.ip,
    });

    return { id: user.id, accessToken, refreshToken };
  }

  async register(input: RegisterInput, clientInfo: ClientInfo) {
    let providerId;
    let email;
    if (input.provider === 'GOOGLE') {
      const googleProfile = await this.getGoogleProfile(
        input.providerAccessToken,
      );
      providerId = googleProfile.id;
      email = googleProfile.email;
    } else {
      const kakaoProfile = await this.getKakaoProfile(
        input.providerAccessToken,
      );
      providerId = kakaoProfile.kakaoId;
      email = kakaoProfile.email;
    }

    const user = await this.userRepository.create({
      provider: input.provider,
      providerId,
      email,
      name: input.name,
    });

    await this.searchService.insertUser(user.id, input.name);

    const accessToken = this.jwtService.sign({ id: user.id });
    const refreshToken = this.jwtService.sign(
      {
        id: user.id,
        type: clientInfo.type,
        device: clientInfo.device,
        model: `${clientInfo.os} ${clientInfo.browser}`,
      },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    await this.userRepository.createRefreshToken({
      userId: user.id,
      refreshToken,
      type: clientInfo.type,
      device: clientInfo.device,
      model: `${clientInfo.os} ${clientInfo.browser}`,
      ip: clientInfo.ip,
    });

    return { accessToken, id: user.id, refreshToken };
  }

  async refresh(userId: string, token: string, clientInfo: ClientInfo) {
    const savedToken = await this.userSelectRepository.findRefreshToken(
      userId,
      token,
    );
    if (!savedToken) {
      throw new HttpException('만료된 refT', 401);
    }

    const accessToken = this.jwtService.sign({ id: userId });
    const refreshToken = this.jwtService.sign(
      {
        id: userId,
        type: clientInfo.type,
        device: clientInfo.device,
        model: `${clientInfo.os} ${clientInfo.browser}`,
      },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    await this.userRepository.updateRefreshToken(userId, token, refreshToken);

    return { accessToken, refreshToken };
  }

  async logout(userId: string, token: string, clientInfo: ClientInfo) {
    await this.userRepository.deleteRefreshToken(userId, token);
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
}

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
};

export type RegisterInput = {
  provider: string;
  providerAccessToken: string;
  name: string;
};
