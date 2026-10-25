import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import type { BoardMemberType, BoardPermission } from './dto/board.response';

const BOARD_TOKEN_EXPIRES_IN = '1d';

export type BoardTokenClaims = {
  boardId: string;
  memberId: string;
  userId: string | null;
  type: BoardMemberType;
  name: string;
  image: string | null;
  permission: BoardPermission;
};

type BoardTokenPayload = BoardTokenClaims & {
  purpose: 'board';
  iat: number;
  exp: number;
};

@Injectable()
export class BoardTokenService {
  private readonly secret: string;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    // 보드 토큰이 accessToken으로 쓰이지 않도록 별도 키로 서명한다.
    this.secret = createHmac('sha256', config.getOrThrow<string>('JWT_SECRET'))
      .update('grimity:board:v1')
      .digest('hex');
  }

  issue(claims: BoardTokenClaims): string {
    return this.jwt.sign(
      { ...claims, purpose: 'board' },
      {
        secret: this.secret,
        algorithm: 'HS256',
        expiresIn: BOARD_TOKEN_EXPIRES_IN,
      },
    );
  }

  verify(token?: string, ignoreExpiration = false): BoardTokenClaims | null {
    if (!token) return null;
    try {
      const payload = this.jwt.verify<BoardTokenPayload>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
        ignoreExpiration,
      });
      if (payload.purpose !== 'board') return null;
      return {
        boardId: payload.boardId,
        memberId: payload.memberId,
        userId: payload.userId,
        type: payload.type,
        name: payload.name,
        image: payload.image,
        permission: payload.permission,
      };
    } catch {
      return null;
    }
  }
}
