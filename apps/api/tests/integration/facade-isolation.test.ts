import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../../src/app';
import { connectTestDb, disconnectTestDb } from './helpers/db';
import { Tenant } from '../../src/models/tenant.model';
import { OpenApp } from '../../src/models/open-app.model';
import { signAccessToken } from '../../src/lib/crypto/jwt';
import { signRequest } from './helpers/sign';
import * as svc from '../../src/services/open-app.service';

const SLUG = 'isolation-test';
let appId: string;
let appSecret: string;

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
    name: 'Isolation Test Partner',
    status: 'active',
    plan: 'basic',
    themeConfig: {},
    aiConfig: { provider: 'mock' },
    limits: { maxUsers: 100 },
  });

  const result = await svc.createApp({
    name: 'Isolation App',
    accountId: String(account._id),
    scopes: ['bazi:calculate'],
  });
  appId = result.app.appId;
  appSecret = result.appSecret;
});

afterAll(async () => {
  await cleanup();
  await disconnectTestDb();
});

describe('门面隔离：/openapi/v1 拒绝裸 JWT', () => {
  it('JWT Bearer token 访问受保护的 /openapi/v1 端点返回 401', async () => {
    const token = signAccessToken({
      userId: 'u1',
      tenantId: 'tenant1',
      userType: 'user',
      isAdmin: false,
      isGuest: false,
    });
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const res = await request(app)
      .post('/openapi/v1/bazi/calculate')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });
});

describe('门面隔离：合法 HMAC 签名可访问', () => {
  it('/openapi/v1/ping 无需鉴权，返回 200', async () => {
    const res = await request(app).get('/openapi/v1/ping');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('合法 HMAC 签名访问 bazi/calculate 成功', async () => {
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const headers = signRequest({ appSecret, method: 'POST', path: '/openapi/v1/bazi/calculate', body });
    const res = await request(app)
      .post('/openapi/v1/bazi/calculate')
      .set('Content-Type', 'application/json')
      .set('X-App-Id', appId)
      .set('X-Timestamp', headers['X-Timestamp'])
      .set('X-Nonce', headers['X-Nonce'])
      .set('X-Signature', headers['X-Signature'])
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('对外 DTO 契约：不暴露 raw 字段', () => {
  it('bazi/calculate 响应 data 中无 raw', async () => {
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const headers = signRequest({ appSecret, method: 'POST', path: '/openapi/v1/bazi/calculate', body });
    const res = await request(app)
      .post('/openapi/v1/bazi/calculate')
      .set('Content-Type', 'application/json')
      .set('X-App-Id', appId)
      .set('X-Timestamp', headers['X-Timestamp'])
      .set('X-Nonce', headers['X-Nonce'])
      .set('X-Signature', headers['X-Signature'])
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('raw');
    expect(res.body.data).toHaveProperty('yearPillar');
    expect(res.body.data).toHaveProperty('wuXingCount');
  });
});

describe('签名篡改与时间戳检测', () => {
  it('篡改签名返回 401 INVALID_SIGNATURE', async () => {
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const headers = signRequest({ appSecret, method: 'POST', path: '/openapi/v1/bazi/calculate', body });
    const res = await request(app)
      .post('/openapi/v1/bazi/calculate')
      .set('Content-Type', 'application/json')
      .set('X-App-Id', appId)
      .set('X-Timestamp', headers['X-Timestamp'])
      .set('X-Nonce', headers['X-Nonce'])
      .set('X-Signature', 'deadbeef' + headers['X-Signature'].slice(8))
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('过期时间戳返回 401 EXPIRED_TIMESTAMP', async () => {
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const oldTs = String(Math.floor(Date.now() / 1000) - 600); // 10 min ago
    const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
    const nonce = crypto.randomBytes(8).toString('hex');
    const signStr = ['POST', '/openapi/v1/bazi/calculate', oldTs, nonce, bodyHash].join('\n');
    const sig = crypto.createHmac('sha256', appSecret).update(signStr).digest('hex');
    const res = await request(app)
      .post('/openapi/v1/bazi/calculate')
      .set('Content-Type', 'application/json')
      .set('X-App-Id', appId)
      .set('X-Timestamp', oldTs)
      .set('X-Nonce', nonce)
      .set('X-Signature', sig)
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('EXPIRED_TIMESTAMP');
  });
});
