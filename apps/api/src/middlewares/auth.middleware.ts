import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/crypto/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

/**
 * Require a valid JWT in Authorization: Bearer <token>
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError());
  }
  try {
    const token = header.slice(7);
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require a valid JWT — but allow guest tokens too
 */
export function requireAuthOrGuest(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, next);
}

/**
 * Require logged-in user (not guest)
 */
export function requireUser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (req.user.isGuest) {
    return next(new ForbiddenError('此功能需要登录'));
  }
  next();
}

/**
 * Require admin role
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (!req.user.isAdmin) {
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
