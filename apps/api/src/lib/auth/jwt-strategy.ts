import { Request } from 'express';
import { verifyAccessToken } from '../crypto/jwt';
import { ROLE_SCOPES } from '../openapi/scopes';
import type { Principal } from '../../types/principal';

/**
 * JWT strategy: parse Authorization: Bearer, produce Principal.
 * Returns null if no Bearer header is present (caller decides whether to reject).
 * Throws UnauthorizedError if token is present but invalid.
 */
export async function jwtStrategy(req: Request): Promise<Principal | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;

  const payload = verifyAccessToken(header.slice(7));

  const userType = payload.isAdmin ? 'admin' : payload.isGuest ? 'guest' : 'user';
  const scopes = ROLE_SCOPES[userType] ?? ROLE_SCOPES['user'];

  return {
    callerType: 'user',
    contextId: payload.tenantId,
    subjectUserId: payload.userId,
    scopes,
    isAdmin: payload.isAdmin,
  };
}
