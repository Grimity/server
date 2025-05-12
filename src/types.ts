import type { UAParser } from 'ua-parser-js';

declare module 'express' {
  interface Request {
    clientInfo?: ClientInfo | null;
    refreshToken?: string;
    user?: { id: string };
  }
}

export type ClientInfo = {
  type: 'WEB' | 'APP';
  device: string;
  model: string;
  ip: string;
};

export type RefreshTokenPayload = {
  id: string;
  type: 'WEB' | 'APP';
  device: string;
  model: string;
};
