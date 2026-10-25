import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { OptionalJwtGuard } from 'src/core/guard';

@Injectable()
export class JoinBoardGuard extends OptionalJwtGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest<Request>();
    // 만료된 헤더를 비로그인으로 처리하면 로그인 사용자가 게스트로 입장해
    // 그린 획의 주인이 바뀐다. 헤더를 보냈다면 유효해야 한다.
    if (request.headers.authorization !== undefined && !request.user) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
