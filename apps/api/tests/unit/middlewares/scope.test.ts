import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireScope, requireSelf, requireBoundContext } from '../../../src/middlewares/scope.middleware';
import type { Principal } from '../../../src/types/principal';

function makeReq(principal?: Partial<Principal>, extra?: Partial<Request>): Request {
  return { principal, ...extra } as unknown as Request;
}

const res = {} as Response;

function run(middleware: ReturnType<typeof requireScope>, req: Request): Error | null {
  let captured: Error | null = null;
  const next: NextFunction = (err?: unknown) => { if (err) captured = err as Error; };
  middleware(req, res, next);
  return captured;
}

describe('requireScope', () => {
  const mw = requireScope('bazi:calculate');

  it('passes when principal has scope', () => {
    const req = makeReq({ callerType: 'user', contextId: 'ctx1', scopes: ['bazi:calculate'] });
    expect(run(mw, req)).toBeNull();
  });

  it('rejects 403 when scope missing', () => {
    const req = makeReq({ callerType: 'user', contextId: 'ctx1', scopes: ['ai:chat'] });
    const err = run(mw, req) as NodeJS.ErrnoException & { statusCode?: number; code?: string };
    expect(err).toBeTruthy();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN_SCOPE');
  });

  it('rejects 401 when no principal', () => {
    const req = makeReq(undefined);
    const err = run(mw, req) as NodeJS.ErrnoException & { statusCode?: number };
    expect(err?.statusCode).toBe(401);
  });

  it('works identically for service callerType', () => {
    const req = makeReq({ callerType: 'service', contextId: 'ctx2', scopes: ['bazi:calculate'] });
    expect(run(mw, req)).toBeNull();
  });
});

describe('requireSelf', () => {
  const mw = requireSelf();

  it('allows user operating on themselves', () => {
    const req = makeReq(
      { callerType: 'user', contextId: 'ctx', subjectUserId: 'u1', scopes: [] },
      { params: { userId: 'u1' } } as Partial<Request>,
    );
    expect(run(mw, req)).toBeNull();
  });

  it('rejects user operating on others', () => {
    const req = makeReq(
      { callerType: 'user', contextId: 'ctx', subjectUserId: 'u1', scopes: [] },
      { params: { userId: 'u2' } } as Partial<Request>,
    );
    const err = run(mw, req) as NodeJS.ErrnoException & { statusCode?: number };
    expect(err?.statusCode).toBe(403);
  });

  it('allows service operating on any userId', () => {
    const req = makeReq(
      { callerType: 'service', contextId: 'ctx', subjectUserId: 'u99', scopes: [] },
      { params: { userId: 'u2' } } as Partial<Request>,
    );
    expect(run(mw, req)).toBeNull();
  });
});

describe('requireBoundContext', () => {
  const mw = requireBoundContext();

  it('passes when contextId is present', () => {
    const req = makeReq({ callerType: 'service', contextId: 'ctx1', scopes: [] });
    expect(run(mw, req)).toBeNull();
  });

  it('rejects when contextId is empty', () => {
    const req = makeReq({ callerType: 'service', contextId: '', scopes: [] });
    const err = run(mw, req) as NodeJS.ErrnoException & { statusCode?: number };
    expect(err?.statusCode).toBe(403);
  });
});
