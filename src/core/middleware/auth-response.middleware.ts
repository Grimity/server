import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export function preventAuthCaching(response: Response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
  response.vary('Origin');
  response.vary('Cookie');
  response.vary('Authorization');
}

@Injectable()
export class AuthResponseMiddleware implements NestMiddleware {
  use(_request: Request, response: Response, next: NextFunction) {
    // Apply to failures as well as successful token / Set-Cookie responses.
    preventAuthCaching(response);
    next();
  }
}
