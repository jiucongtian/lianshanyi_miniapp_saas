import { describe, it, expect } from 'vitest';
import { buildSignString, hmacSha256, timingSafeCompare, generateAppId, generateAppSecret } from '../../../src/lib/crypto/sign';
import { encryptSecret, decryptSecret, getCachedSecret, invalidateSecretCache } from '../../../src/lib/crypto/app-secret';

// Set required env var for AES tests
process.env.OPENAPI_SECRET_ENC_KEY = 'a'.repeat(64); // 32 bytes in hex

describe('buildSignString', () => {
  it('joins 5 fields with single \\n, body is sha256 of empty string for GET', () => {
    const s = buildSignString('GET', '/openapi/v1/ping', '1718000000', 'abc', '');
    const parts = s.split('\n');
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('GET');
    expect(parts[1]).toBe('/openapi/v1/ping');
    expect(parts[2]).toBe('1718000000');
    expect(parts[3]).toBe('abc');
    // SHA-256 of empty string
    expect(parts[4]).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('uppercases method', () => {
    const s = buildSignString('post', '/path', '1', 'n', '');
    expect(s.startsWith('POST\n')).toBe(true);
  });
});

describe('hmacSha256 + timingSafeCompare', () => {
  it('produces consistent hex', () => {
    const sig = hmacSha256('secret', 'data');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(hmacSha256('secret', 'data')).toBe(sig);
  });

  it('timingSafeCompare returns true for equal strings', () => {
    expect(timingSafeCompare('abc', 'abc')).toBe(true);
  });

  it('timingSafeCompare returns false for different strings', () => {
    expect(timingSafeCompare('abc', 'def')).toBe(false);
  });

  it('timingSafeCompare returns false for different lengths', () => {
    expect(timingSafeCompare('abc', 'ab')).toBe(false);
  });
});

describe('AES-256-GCM secret encryption', () => {
  it('encrypt then decrypt round-trips', () => {
    const plain = generateAppSecret();
    const enc = encryptSecret(plain);
    expect(enc).not.toBe(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const enc1 = encryptSecret('same-secret');
    const enc2 = encryptSecret('same-secret');
    expect(enc1).not.toBe(enc2);
  });
});

describe('secret LRU cache', () => {
  it('caches decrypted secret by appId', () => {
    const plain = generateAppSecret();
    const enc = encryptSecret(plain);
    invalidateSecretCache('test-app');
    const result1 = getCachedSecret('test-app', enc);
    const result2 = getCachedSecret('test-app', enc);
    expect(result1).toBe(plain);
    expect(result2).toBe(plain);
  });

  it('invalidateSecretCache forces re-decrypt on next call', () => {
    const plain = generateAppSecret();
    const enc = encryptSecret(plain);
    getCachedSecret('app-x', enc);
    invalidateSecretCache('app-x');
    expect(getCachedSecret('app-x', enc)).toBe(plain);
  });
});

describe('generateAppId / generateAppSecret', () => {
  it('appId starts with app_', () => {
    expect(generateAppId()).toMatch(/^app_[0-9a-f]{24}$/);
  });

  it('appSecret is 64 hex chars', () => {
    expect(generateAppSecret()).toMatch(/^[0-9a-f]{64}$/);
  });
});
