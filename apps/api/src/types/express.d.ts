import type { ITenant } from '../models/tenant.model';
import type { JwtPayload } from '../lib/crypto/jwt';
import type { Principal } from './principal';

export {};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenant?: ITenant;
      principal?: Principal;
      rawBody?: Buffer;
      openAppRateLimit?: { appId: string; windowMs: number; max: number };
    }
  }
}
