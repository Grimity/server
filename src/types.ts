import type { UAParser } from 'ua-parser-js';

declare module 'express' {
  interface Request {
    clientInfo?: ClientInfo | null;
    refreshToken?: string;
    user?: { id: string };
  }
}

export type ClientInfo = WebInfo;

export type WebInfo = {
  type: 'WEB';
  browser: Exclude<UAParser.IBrowser['name'], undefined>;
  os: Exclude<UAParser.IOS['name'], undefined>;
  device: Exclude<UAParser.IDevice['type'] | 'desktop', undefined>;
  ip: string;
};

export type RefreshTokenPayload = {
  id: string;
  type: 'WEB';
  device: string;
  model: string;
};
