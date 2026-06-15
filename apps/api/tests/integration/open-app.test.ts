import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectTestDb, disconnectTestDb } from './helpers/db';
import { Tenant } from '../../src/models/tenant.model';
import { OpenApp } from '../../src/models/open-app.model';
import * as svc from '../../src/services/open-app.service';

const SLUG = 'test-partner-unit';
let accountId: string;

async function cleanup() {
  const t = await Tenant.findOne({ slug: SLUG });
  if (t) {
    await OpenApp.deleteMany({ accountId: t._id });
    await t.deleteOne();
  }
}

beforeAll(async () => {
  await connectTestDb();
  await cleanup();

  const account = await Tenant.create({
    type: 'partner',
    slug: SLUG,
    name: 'Test Partner',
    status: 'active',
    plan: 'basic',
    themeConfig: {},
    aiConfig: { provider: 'mock' },
    limits: { maxUsers: 100 },
  });
  accountId = String(account._id);
});

afterAll(async () => {
  await cleanup();
  await disconnectTestDb();
});

describe('createApp', () => {
  it('returns one-time plaintext secret; DB stores only ciphertext', async () => {
    const { app, appSecret } = await svc.createApp({
      name: 'Test App',
      accountId,
      scopes: ['bazi:calculate'],
    });
    expect(appSecret).toMatch(/^[0-9a-f]{64}$/);
    const stored = await OpenApp.findOne({ appId: app.appId }).lean();
    expect(stored?.secretEnc).not.toBe(appSecret);
    expect(stored?.secretEnc.length).toBeGreaterThan(40);
  });

  it('rejects data scopes when no accountId provided', async () => {
    await expect(
      svc.createApp({ name: 'Bad', accountId: '', scopes: ['profile:read:any'] }),
    ).rejects.toThrow();
  });
});

describe('rotateSecret', () => {
  it('returns new secret different from old', async () => {
    const { app, appSecret: oldSecret } = await svc.createApp({
      name: 'Rotate App',
      accountId,
      scopes: ['ai:chat'],
    });
    const { appSecret: newSecret } = await svc.rotateSecret(app.appId);
    expect(newSecret).not.toBe(oldSecret);
    expect(newSecret).toMatch(/^[0-9a-f]{64}$/);
  });

  it('throws NotFoundError for unknown appId', async () => {
    await expect(svc.rotateSecret('app_nonexistent')).rejects.toThrow('OpenApp');
  });
});

describe('setStatus / findActiveByAppId', () => {
  it('disabled app not returned by findActiveByAppId', async () => {
    const { app } = await svc.createApp({
      name: 'Disable App',
      accountId,
      scopes: ['bazi:calculate'],
    });
    await svc.setStatus(app.appId, 'disabled');
    expect(await svc.findActiveByAppId(app.appId)).toBeNull();
  });

  it('re-enabling app makes it findable again', async () => {
    const { app } = await svc.createApp({
      name: 'Toggle App',
      accountId,
      scopes: ['bazi:calculate'],
    });
    await svc.setStatus(app.appId, 'disabled');
    await svc.setStatus(app.appId, 'active');
    expect(await svc.findActiveByAppId(app.appId)).not.toBeNull();
  });
});

describe('updateScopes — data scope constraint', () => {
  it('allows data scopes when credential has bound accountId', async () => {
    const { app } = await svc.createApp({
      name: 'Scope App',
      accountId,
      scopes: ['bazi:calculate'],
    });
    await expect(
      svc.updateScopes(app.appId, ['bazi:calculate', 'profile:read:self']),
    ).resolves.toBeUndefined();
  });
});
