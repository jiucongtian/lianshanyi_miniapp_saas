import { describe, it, expect, vi } from 'vitest';
import { sendSuccess, sendError, paginationMeta } from '../../../src/utils/response';
import type { Response } from 'express';

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('sendSuccess', () => {
  it('sends 200 with data', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 }, error: null });
  });

  it('sends custom status code', () => {
    const res = mockRes();
    sendSuccess(res, null, 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('includes meta when provided', () => {
    const res = mockRes();
    sendSuccess(res, [], 200, { total: 100, page: 1, limit: 10 });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { total: 100, page: 1, limit: 10 } }),
    );
  });
});

describe('sendError', () => {
  it('sends error response', () => {
    const res = mockRes();
    sendError(res, '出错了', 400);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, data: null, error: '出错了' });
  });
});

describe('paginationMeta', () => {
  it('calculates pages correctly', () => {
    expect(paginationMeta(100, 1, 10)).toEqual({ total: 100, page: 1, limit: 10, pages: 10 });
    expect(paginationMeta(101, 1, 10)).toEqual({ total: 101, page: 1, limit: 10, pages: 11 });
  });
});
