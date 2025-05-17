import 'express';
import type { ClientInfo } from './shared/types/client-info';
declare module 'express' {
  interface Request {
    clientInfo?: ClientInfo | null;
    refreshToken?: string;
    user?: { id: string };
  }
}
