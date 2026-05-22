import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponse['meta'],
): void {
  const body: ApiResponse<T> = { success: true, data, error: null };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  data: unknown = null,
): void {
  const body: ApiResponse = { success: false, data, error: message };
  res.status(statusCode).json(body);
}

export function paginationMeta(
  total: number,
  page: number,
  limit: number,
): ApiResponse['meta'] {
  return { total, page, limit, pages: Math.ceil(total / limit) };
}
