import 'express';
import type { ClientInfo } from './shared/types/client-info';
import type { WebSession } from './module/auth/web-session.service';
declare module 'express' {
  interface Request {
    clientInfo?: ClientInfo | null;
    refreshToken?: string;
    webSession?: WebSession;
    user?: { id: string } | null;
  }
}
