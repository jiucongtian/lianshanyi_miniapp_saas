import crypto from 'crypto';

/**
 * Build the canonical sign string for HMAC verification.
 * Format: METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY_HASH  (5 fields, single \n, no trailing newline)
 */
export function buildSignString(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: string | Buffer,
): string {
  const bodyHash = crypto
    .createHash('sha256')
    .update(body)
    .digest('hex');
  return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n');
}

export function hmacSha256(secret: string, data: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still run the comparison to avoid timing leaks via short-circuit
    crypto.timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function generateAppId(): string {
  return 'app_' + crypto.randomBytes(12).toString('hex');
}

export function generateAppSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
