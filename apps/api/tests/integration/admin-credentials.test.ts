import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import { connectTestDb, disconnectTestDb } from './helpers/db';
import { Tenant } from '../../src/models/tenant.model';
import { User } from '../../src/models/user.model';
import { OpenApp } from '../../src/models/open-app.model';
import { signAccessToken } from '../../src/lib/crypto/jwt';
import { signRequest } from './helpers/sign';

const SLUG = 'admin-cred-test';
let tenantId: string;
let adminToken: string;

async function cleanup() {
  const t = await Tenant.findOne({ slug: SLUG });
  if (t) {
    await User.deleteMany({ tenantId: t._id });
    await OpenApp.deleteMany({ accountId: t._id });
    await t.deleteOne();
  }
}

beforeAll(async () => {
  await connectTestDb();
  await cleanup();

  const tenant = await Tenant.create({
    type: 'tenant', slug: SLUG, name: 'Cred Test',
    status: 'active', plan: 'basic', themeConfig: {}, aiConfig: { provider: 'mock' },
    limits: { maxUsers: 10 },
  });
  tenantId = String(tenant._id);

  const hash = await bcrypt.hash('Admin@1234', 10);
  const admin = await User.create({
    tenantId, username: 'cred_admin', passwordHash: hash, isAdmin: true, userType: 'normal',
  });

  adminToken = signAccessToken({
    userId: admin._id.toString(), tenantId,
    userType: 'admin', isAdmin: true, isGuest: false,
  });
});

afterAll(async () => {
  await cleanup();
  await disconnectTestDb();
});

describe('POST /api/v1/admin/credentials (create)', () => {
  it('创建凭据返回一次性明文 Secret（64位 hex）', async () => {
    const res = await request(app)
      .post('/api/v1/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '测试联调方', accountId: tenantId, remark: '测试备注', scopes: ['bazi:calculate'] });

    expect(res.status).toBe(201);
    expect(res.body.data.appId).toBeTruthy();
    expect(res.body.data.appSecret).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.data.remark).toBe('测试备注');
  });

  it('列表接口不返回 appSecret 或 secretEnc', async () => {
    const res = await request(app)
      .get('/api/v1/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const cred of res.body.data) {
      expect(cred.appSecret).toBeUndefined();
      expect(cred.secretEnc).toBeUndefined();
    }
  });
});

describe('PATCH /api/v1/admin/credentials/:appId (update)', () => {
  let appId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '旧备注凭据', accountId: tenantId, remark: '旧备注', scopes: ['bazi:calculate'] });
    appId = res.body.data.appId;
  });

  it('可以更新 remark', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/credentials/${appId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ remark: '新备注' });

    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/admin/credentials/:appId/rotate-secret', () => {
  let appId: string;
  let oldSecret: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '轮换测试', accountId: tenantId, remark: '轮换', scopes: ['bazi:calculate'] });
    appId = res.body.data.appId;
    oldSecret = res.body.data.appSecret;
  });

  it('轮换后返回新 Secret，旧 Secret 无法通过 HMAC 验证', async () => {
    const rotRes = await request(app)
      .post(`/api/v1/admin/credentials/${appId}/rotate-secret`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(rotRes.status).toBe(200);
    expect(rotRes.body.data.appSecret).toMatch(/^[0-9a-f]{64}$/);
    expect(rotRes.body.data.appSecret).not.toBe(oldSecret);

    // 旧 secret 应失败
    const path = '/openapi/v1/bazi/calculate';
    const body = JSON.stringify({ year: 1990, month: 1, day: 1, hour: 12 });
    const oldRes = await request(app)
      .post(path)
      .set('Content-Type', 'application/json')
      .set('X-App-Id', appId)
      .set(signRequest({ appSecret: oldSecret, method: 'POST', path, body }))
      .send(body);

    expect(oldRes.status).toBe(401);
  });
});

describe('PATCH /api/v1/admin/credentials/:appId/status (disable)', () => {
  let appId: string;
  let secret: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/admin/credentials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '禁用测试', accountId: tenantId, remark: '禁用', scopes: ['bazi:calculate'] });
    appId = res.body.data.appId;
    secret = res.body.data.appSecret;
  });

  it('禁用后凭据调用返回 401', async () => {
    // 禁用
    await request(app)
      .patch(`/api/v1/admin/credentials/${appId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'disabled' });

    // 禁用后调用被拒
    const path = '/openapi/v1/bazi/calculate';
    const body = JSON.stringify({ year: 1990, month: 1, day: 1, hour: 12 });
    const after = await request(app)
      .post(path)
      .set('Content-Type', 'application/json')
      .set('X-App-Id', appId)
      .set(signRequest({ appSecret: secret, method: 'POST', path, body }))
      .send(body);
    expect(after.status).toBe(401);
  });
});
