import { Request, Response, NextFunction } from 'express';
import { OpenApiLog } from '../models/open-api-log.model';
import { logger } from '../utils/logger';

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startMs = Date.now();

  res.on('finish', () => {
    const principal = req.principal;
    const appId = req.headers['x-app-id'] as string | undefined;

    OpenApiLog.create({
      appId: appId ?? principal?.contextId,
      contextId: principal?.contextId,
      path: req.path,
      scope: undefined, // populated by route handlers if needed
      statusCode: res.statusCode,
      code: (res.locals as { code?: string }).code,
      latencyMs: Date.now() - startMs,
    }).catch((err: unknown) => {
      logger.warn({ err }, 'Failed to write audit log');
    });
  });

  next();
}
