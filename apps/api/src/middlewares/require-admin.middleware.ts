import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  try {
    const p = req.principal;
    if (!p) throw new AppError('未提供有效凭据', 401, 'UNAUTHORIZED');
    if (!p.isAdmin) throw new AppError('需要管理员权限', 403, 'FORBIDDEN_ADMIN');
    next();
  } catch (err) {
    next(err);
  }
}
