import { Request, Response, NextFunction } from 'express';
import { jwtStrategy } from '../lib/auth/jwt-strategy';
import { hmacStrategy } from '../lib/auth/hmac-strategy';
import { AppError } from '../utils/errors';

export type AuthStrategy = 'jwt' | 'hmac';

/**
 * authenticate(strategies) — try each strategy in order, inject req.principal.
 * If none match, returns 401.
 */
export function authenticate(...strategies: AuthStrategy[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      for (const strategy of strategies) {
        let principal = null;
        if (strategy === 'jwt') principal = await jwtStrategy(req);
        if (strategy === 'hmac') principal = await hmacStrategy(req);
        if (principal) {
          req.principal = principal;
          return next();
        }
      }
      throw new AppError('未提供有效凭据', 401, 'INVALID_SIGNATURE');
    } catch (err) {
      next(err);
    }
  };
}
