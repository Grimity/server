import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { WebSessionService } from 'src/module/auth/web-session.service';
import { preventAuthCaching } from '../middleware/auth-response.middleware';

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private webSessions: WebSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    // Anonymous and personalized responses must not share a cache entry.
    response.vary('Cookie');
    response.vary('Authorization');
    response.vary('Origin');
    if (request.headers.authorization !== undefined || request.headers.cookie) {
      preventAuthCaching(response);
    }
    if (request.headers.authorization === undefined) {
      request.user = null;
      if (!this.webSessions.readCookie(request)) return true;
      try {
        const session = await this.webSessions.authenticateRequest(request);
        request.user = { id: session.userId };
      } catch (error) {
        // Public endpoints already treat expired credentials as anonymous.
        // Do not swallow Origin failures or database errors.
        if (!(error instanceof UnauthorizedException)) throw error;
      }
      return true;
    }
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      request.user = null;
      return true;
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
    } catch {
      request.user = null;
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    if (!request.headers.authorization) {
      return undefined;
    }
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
