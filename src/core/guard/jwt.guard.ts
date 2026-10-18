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
export class JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private webSessions: WebSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    preventAuthCaching(context.switchToHttp().getResponse<Response>());
    // Header presence, not validity, decides which authentication to use.
    if (request.headers.authorization === undefined) {
      const session = await this.webSessions.authenticateRequest(request);
      request.user = { id: session.userId };
      return true;
    }
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
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
