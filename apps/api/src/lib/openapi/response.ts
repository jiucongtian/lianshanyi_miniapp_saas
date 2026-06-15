import { Response } from 'express';

export const ERROR_CODES = {
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  EXPIRED_TIMESTAMP: 'EXPIRED_TIMESTAMP',
  REPLAY_DETECTED: 'REPLAY_DETECTED',
  FORBIDDEN_SCOPE: 'FORBIDDEN_SCOPE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAZI_OUT_OF_RANGE: 'BAZI_OUT_OF_RANGE',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_UPSTREAM_ERROR: 'AI_UPSTREAM_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function sendOk<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data, error: null, code: null });
}

export function sendErr(res: Response, status: number, code: ErrorCode, message: string): void {
  res.status(status).json({ success: false, data: null, error: message, code });
}
