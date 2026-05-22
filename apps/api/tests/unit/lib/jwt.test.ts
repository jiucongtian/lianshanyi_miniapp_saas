import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../../src/lib/crypto/jwt';
import { UnauthorizedError } from '../../../src/utils/errors';

const testPayload = {
  userId: 'user123',
  userType: 'normal',
  isAdmin: false,
  isGuest: false,
};

describe('JWT', () => {
  it('signs and verifies access token', () => {
    const token = signAccessToken(testPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe('user123');
    expect(decoded.userType).toBe('normal');
    expect(decoded.isAdmin).toBe(false);
  });

  it('signs and verifies refresh token', () => {
    const token = signRefreshToken('user123');
    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe('user123');
  });

  it('throws UnauthorizedError for invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError for invalid refresh token', () => {
    expect(() => verifyRefreshToken('bad.token')).toThrow(UnauthorizedError);
  });
});
