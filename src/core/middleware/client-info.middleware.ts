import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class ClientInfoMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
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
        req.clientInfo = null;
        return next();
      }

      req.clientInfo = {
        type: 'APP',
        device,
        model,
        ip,
      };
      return next();
    } else {
      const uaParser = new UAParser(req.headers['user-agent']);
      const { browser, os, device } = uaParser.getResult();

      if (!browser.name || !os.name || !req.ip || !ip) {
        // req.clientInfo = null;
        // return next();
        console.log(req.headers['user-agent']);
      }

      req.clientInfo = {
        type: 'WEB',
        device: device.type ?? 'desktop',
        model: `${os.name ?? 'unknown'} ${browser.name ?? 'unknown'}`,
        ip: ip ?? 'unknown',
      };

      return next();
    }
  }
}
