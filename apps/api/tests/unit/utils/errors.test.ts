import { describe, it, expect } from 'vitest';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../../src/utils/errors';

describe('AppError subclasses', () => {
  it('UnauthorizedError has 401 status', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError has 403 status', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it('NotFoundError has 404 status', () => {
    const err = new NotFoundError('用户');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('用户');
  });

  it('ConflictError has 409 status', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
  });

  it('ValidationError has 422 status', () => {
    const err = new ValidationError('invalid');
    expect(err.statusCode).toBe(422);
  });

  it('AppError is instanceof Error', () => {
    const err = new AppError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});
