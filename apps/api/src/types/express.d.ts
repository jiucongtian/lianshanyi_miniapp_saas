import type { ITenant } from '../models/tenant.model';
import type { JwtPayload } from '../lib/crypto/jwt';

export {};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenant?: ITenant;
    }
  }
}
