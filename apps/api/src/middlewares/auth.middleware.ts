import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/crypto/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

/**
 * Parse Bearer token from request and populate req.user.
 * Returns true on success, calls next(err) and returns false on failure.
 */
function parseBearer(req: Request, next: NextFunction): boolean {
  if (req.user) return true; // already parsed upstream
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError());
    return false;
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    return true;
  } catch (err) {
    next(err);
    return false;
  }
}

/**
 * Require a valid JWT in Authorization: Bearer <token>
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (parseBearer(req, next)) next();
}

/**
 * Require a valid JWT — but allow guest tokens too
 */
export function requireAuthOrGuest(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, next);
}

/**
 * Require logged-in non-guest user.
 * Self-contained: parses the Bearer token if req.user is not yet set.
 */
export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  if (!parseBearer(req, next)) return;
  if (req.user!.isGuest) {
    return next(new ForbiddenError('此功能需要登录'));
  }
  next();
}

/**
 * Require admin role.
 * Self-contained: parses the Bearer token if req.user is not yet set.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!parseBearer(req, next)) return;
  if (!req.user!.isAdmin) {
    return next(new ForbiddenError('此功能需要管理员权限'));
  }
  next();
}

/**
 * Optional auth — populate req.user if token present, don't fail if absent
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // ignore invalid token in optional mode
    }
  }
  next();
}
