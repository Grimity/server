import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class ClientInfoMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const uaParser = new UAParser(req.headers['user-agent']);
    const { browser, os, device } = uaParser.getResult();
    const xForwardedFor = req.headers['x-forwarded-for'];
    let ip;

    if (typeof xForwardedFor === 'string') {
      ip = xForwardedFor.split(',')[0];
    } else {
      ip = req.ip;
    }

    if (!browser.name || !os.name || !req.ip || !ip) {
      req.clientInfo = null;
      return next();
    }

    req.clientInfo = {
      type: 'WEB',
      browser: browser.name,
      os: os.name,
      device: device.type ?? 'desktop',
      ip,
    };

    return next();
  }
}
