import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import type { RefreshTokenPayload } from 'src/types';

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      })) as RefreshTokenPayload;
      if (!request.clientInfo) {
        throw Error;
      }
      const currentModel =
        request.clientInfo.type === 'WEB'
          ? `${request.clientInfo.os} ${request.clientInfo.browser}`
          : request.clientInfo.model;
      if (
        payload.type !== request.clientInfo.type ||
        payload.device !== request.clientInfo.device ||
        payload.model !== currentModel
      ) {
        throw Error;
      }
      request.refreshToken = token;
      request.user = { id: payload.id };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
