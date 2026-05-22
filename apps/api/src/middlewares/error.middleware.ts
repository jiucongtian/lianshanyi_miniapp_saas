import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('ErrorMiddleware');

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      log.error({ err }, 'Application error');
    }
    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    res.status(422).json({
      success: false,
      data: null,
      error: `参数校验失败: ${message}`,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // Mongoose duplicate key error
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      data: null,
      error: '数据已存在',
      code: 'CONFLICT',
    });
    return;
  }

  log.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    data: null,
    error: '服务器内部错误',
    code: 'INTERNAL_ERROR',
  });
}
