import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UAParser } from 'ua-parser-js';
import { ClientInfo } from 'src/shared/types/client-info';

export function readClientInfo(req: Request): ClientInfo | null {
  const xForwardedFor = req.headers['x-forwarded-for'];
  let ip;

  if (typeof xForwardedFor === 'string') {
    ip = xForwardedFor.split(',')[0];
  } else {
    ip = req.ip;
  }

  if (req.headers['grimity-app-device'] && req.headers['grimity-app-model']) {
    const device = req.headers['grimity-app-device'];
    const model = req.headers['grimity-app-model'];

    if (
      (device !== 'mobile' && device !== 'tablet') ||
      !model ||
      typeof model !== 'string' ||
      !ip
    ) {
      return null;
    }

    return {
      type: 'APP',
      device,
      model,
      ip,
    };
  } else {
    const uaParser = new UAParser(req.headers['user-agent']);
    const { browser, os, device } = uaParser.getResult();

    return {
      type: 'WEB',
      device: device.type ?? 'desktop',
      model: `${os.name ?? 'unknown'} ${browser.name ?? 'unknown'}`,
      ip: ip ?? 'unknown',
    };
  }
}

@Injectable()
export class ClientInfoMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    req.clientInfo = readClientInfo(req);
    next();
  }
}
