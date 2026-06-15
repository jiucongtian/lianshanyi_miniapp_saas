import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

function forbidden(msg: string): never {
  throw new AppError(msg, 403, 'FORBIDDEN_SCOPE');
}

/**
 * requireScope(scope) — check Principal.scopes contains the required scope.
 * Works for all callerTypes (user / service).
 */
export function requireScope(scope: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const p = req.principal;
      if (!p) throw new AppError('未鉴权', 401, 'INVALID_SIGNATURE');
      if (!p.scopes.includes(scope)) forbidden(`缺少权限 ${scope}`);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requireSelf() — for :self scopes, ensure subjectUserId == the requesting user.
 * Only applies to callerType='user'; service calls supply actAsUserId freely.
 */
export function requireSelf() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const p = req.principal;
      if (!p) throw new AppError('未鉴权', 401, 'INVALID_SIGNATURE');
      if (p.callerType === 'user') {
        const target = (req.params.userId ?? req.body?.userId) as string | undefined;
        if (target && target !== p.subjectUserId) {
          forbidden('仅可操作本人数据');
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requireBoundContext() — data-scoped operations must have a contextId.
 * Enforces red line: data scopes only on credentials bound to an Account.
 */
export function requireBoundContext() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const p = req.principal;
      if (!p) throw new AppError('未鉴权', 401, 'INVALID_SIGNATURE');
      if (!p.contextId) forbidden('此操作需要绑定账户上下文');
      next();
    } catch (err) {
      next(err);
    }
  };
}
