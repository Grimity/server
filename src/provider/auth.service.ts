import { Injectable, HttpException } from '@nestjs/common';
import { UserRepository } from 'src/repository/user.repository';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
  ) {}

  async login(provider: string, providerAccessToken: string) {
    let providerId;

    if (provider === 'GOOGLE') {
      const googleProfile = await this.getGoogleProfile(providerAccessToken);
      providerId = googleProfile.id;
    } else {
      const kakaoProfile = await this.getKakaoProfile(providerAccessToken);
      providerId = kakaoProfile.kakaoId;
    }

    const user = await this.userRepository.findOneByProviderOrThrow(
      provider,
      providerId,
    );

    const accessToken = this.jwtService.sign({ id: user.id });
    return { accessToken, id: user.id };
  }

  async register({
    provider,
    providerAccessToken,
    name,
  }: {
    provider: string;
    providerAccessToken: string;
    name: string;
  }) {
    let providerId;
    let email;
    if (provider === 'GOOGLE') {
      const googleProfile = await this.getGoogleProfile(providerAccessToken);
      providerId = googleProfile.id;
      email = googleProfile.email;
    } else {
      const kakaoProfile = await this.getKakaoProfile(providerAccessToken);
      providerId = kakaoProfile.kakaoId;
      email = kakaoProfile.email;
    }

    const user = await this.userRepository.create({
      provider,
      providerId,
      email,
      name,
    });

    const accessToken = this.jwtService.sign({ id: user.id });
    return { accessToken, id: user.id };
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
