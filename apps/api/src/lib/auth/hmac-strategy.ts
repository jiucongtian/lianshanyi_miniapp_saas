import { Request } from 'express';
import { createClient } from 'redis';
import { buildSignString, hmacSha256, timingSafeCompare } from '../crypto/sign';
import { getCachedSecret } from '../crypto/app-secret';
import { OpenApp } from '../../models/open-app.model';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { Principal } from '../../types/principal';

const SIGN_WINDOW_MS = Number(process.env.OPENAPI_SIGN_WINDOW_MS ?? 300_000); // 5 min

// Optional Redis for nonce deduplication
let redis: ReturnType<typeof createClient> | null = null;
let redisReady = false;

async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (redis) return redisReady ? redis : null;
  try {
    redis = createClient({ url: process.env.REDIS_URL });
    redis.on('error', (err) => {
      logger.warn({ err }, 'Redis nonce cache error — falling back to timestamp-only replay check');
      redisReady = false;
    });
    await redis.connect();
    redisReady = true;
    return redis;
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — nonce dedup disabled');
    redisReady = false;
    return null;
  }
}

function unauthorized(code: string, message: string): never {
  throw new AppError(message, 401, code);
}

/**
 * HMAC strategy: validate X-App-Id + X-Timestamp + X-Nonce + X-Signature headers.
 * Produces Principal on success; throws AppError on failure.
 */
export async function hmacStrategy(req: Request): Promise<Principal | null> {
  const appId = req.headers['x-app-id'] as string | undefined;
  if (!appId) return null;

  const timestamp = req.headers['x-timestamp'] as string | undefined;
  const nonce = req.headers['x-nonce'] as string | undefined;
  const signature = req.headers['x-signature'] as string | undefined;

  if (!timestamp || !nonce || !signature) {
    unauthorized('INVALID_SIGNATURE', '缺少签名头');
  }

  // Timestamp window check
  const ts = Number(timestamp);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > SIGN_WINDOW_MS / 1000) {
    unauthorized('EXPIRED_TIMESTAMP', '请求时间戳已过期');
  }

  // Load app credential
  const app = await OpenApp.findOne({ appId, status: 'active' }).lean();
  if (!app) unauthorized('INVALID_SIGNATURE', '无效的 appId 或应用已禁用');

  // Verify signature — use req.originalUrl path (strip query string) for HMAC
  const path = req.originalUrl.split('?')[0];
  const body: Buffer | string = req.rawBody ?? JSON.stringify(req.body ?? {});
  const signStr = buildSignString(req.method, path, timestamp, nonce, body);
  const secret = getCachedSecret(appId, app.secretEnc);
  const expected = hmacSha256(secret, signStr);

  if (!timingSafeCompare(signature, expected)) {
    unauthorized('INVALID_SIGNATURE', '签名校验失败');
  }

  // Nonce dedup via Redis (optional, degrades gracefully)
  const r = await getRedis().catch(() => null);
  if (r && redisReady) {
    const key = `nonce:${appId}:${nonce}`;
    const ttl = Math.ceil(SIGN_WINDOW_MS / 1000);
    const set = await r.set(key, '1', { NX: true, EX: ttl }).catch(() => null);
    if (set === null) {
      unauthorized('REPLAY_DETECTED', 'nonce 已被使用，请勿重放请求');
    }
  }

  return {
    callerType: 'service',
    contextId: String(app.accountId),
    subjectUserId: (req.body?.actAsUserId as string | undefined) ?? undefined,
    scopes: app.scopes,
  };
}
