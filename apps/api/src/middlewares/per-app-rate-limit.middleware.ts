import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

// Cache key: `${appId}:${windowMs}:${max}` — config change produces a new handler naturally
const handlerCache = new Map<string, RateLimitRequestHandler>();

function getHandler(appId: string, windowMs: number, max: number): RateLimitRequestHandler {
  const key = `${appId}:${windowMs}:${max}`;
  const cached = handlerCache.get(key);
  if (cached) return cached;

  const handler = rateLimit({
    windowMs,
    max,
    keyGenerator: () => appId,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: '请求频率超限，请稍后重试', code: 'RATE_LIMITED' },
  });

  handlerCache.set(key, handler);
  return handler;
}

/**
 * Per-appId rate limiter for /openapi/v1 routes.
 * Must be placed after authenticate('hmac'), which attaches req.openAppRateLimit.
 */
export function perAppRateLimit(req: Request, res: Response, next: NextFunction): void {
  const cfg = req.openAppRateLimit;
  if (!cfg) { next(); return; }
  getHandler(cfg.appId, cfg.windowMs, cfg.max)(req, res, next);
}
