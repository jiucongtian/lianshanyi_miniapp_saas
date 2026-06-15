import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getMasterKey(): Buffer {
  const key = process.env.OPENAPI_SECRET_ENC_KEY;
  if (!key) throw new Error('OPENAPI_SECRET_ENC_KEY is not set');
  const buf = Buffer.from(key, 'hex');
  if (buf.length !== 32) throw new Error('OPENAPI_SECRET_ENC_KEY must be 32 bytes (64 hex chars)');
  return buf;
}

/** Encrypt plaintext appSecret → base64 ciphertext (iv:tag:ciphertext) */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv) as crypto.CipherGCM;
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/** Decrypt base64 ciphertext → plaintext appSecret */
export function decryptSecret(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// Simple LRU cache: cap at 512 entries, evict oldest on overflow
const CACHE_MAX = 512;
const secretCache = new Map<string, string>();

export function getCachedSecret(appId: string, secretEnc: string): string {
  if (secretCache.has(appId)) return secretCache.get(appId)!;
  const plain = decryptSecret(secretEnc);
  if (secretCache.size >= CACHE_MAX) {
    const oldest = secretCache.keys().next().value;
    if (oldest !== undefined) secretCache.delete(oldest);
  }
  secretCache.set(appId, plain);
  return plain;
}

/** Call on rotate or disable to force re-decrypt on next request */
export function invalidateSecretCache(appId: string): void {
  secretCache.delete(appId);
}
