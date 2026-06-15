import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { connectTestDb, disconnectTestDb } from './helpers/db';
import { Tenant } from '../../src/models/tenant.model';
import { OpenApp } from '../../src/models/open-app.model';
import { signRequest } from './helpers/sign';
import * as svc from '../../src/services/open-app.service';

const SLUG = 'endpoint-test';
let appId: string;
let appSecret: string;
let appIdNoScope: string;
let appSecretNoScope: string;

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
    name: 'Endpoint Test Partner',
    status: 'active',
    plan: 'basic',
    themeConfig: {},
    aiConfig: { provider: 'mock' },
    limits: { maxUsers: 100 },
  });
  const accountId = String(account._id);

  const full = await svc.createApp({ name: 'Full Scope App', accountId, scopes: ['bazi:calculate', 'ai:chat'] });
  appId = full.app.appId;
  appSecret = full.appSecret;

  const limited = await svc.createApp({ name: 'No Scope App', accountId, scopes: [] });
  appIdNoScope = limited.app.appId;
  appSecretNoScope = limited.appSecret;
});

afterAll(async () => {
  await cleanup();
  await disconnectTestDb();
});

function hdrs(method: string, path: string, body: string, secret: string, id: string) {
  return { 'Content-Type': 'application/json', 'X-App-Id': id, ...signRequest({ appSecret: secret, method, path, body }) };
}

// ── bazi/calculate ───────────────────────────────────────────────────────────

describe('POST /openapi/v1/bazi/calculate', () => {
  const PATH = '/openapi/v1/bazi/calculate';

  it('公历日期成功返回四柱和五行，无 raw', async () => {
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d).toHaveProperty('yearPillar.stem');
    expect(d).toHaveProperty('wuXingCount');
    expect(Object.values(d.wuXingCount as Record<string, number>).reduce((a, b) => a + b, 0)).toBe(8);
    expect(d).not.toHaveProperty('raw');
  });

  it('缺少必填字段返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({ year: 1990, month: 8 });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('年份超出范围 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({ year: 1800, month: 1, day: 1, hour: 0 });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('缺少 scope 返回 403 FORBIDDEN_SCOPE', async () => {
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecretNoScope, appIdNoScope)).send(body);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_SCOPE');
  });

  it('农历日期成功计算，含 lunarDate', async () => {
    const body = JSON.stringify({ year: 1990, month: 7, day: 25, hour: 14, isLunar: true });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('lunarDate');
  });
});

// ── ai/chat ───────────────────────────────────────────────────────────────────

describe('POST /openapi/v1/ai/chat', () => {
  const PATH = '/openapi/v1/ai/chat';

  it('单轮问答成功，响应含 reply 无 conversationId', async () => {
    const body = JSON.stringify({ content: 'help me understand gengwu day pillar' });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reply');
    expect(res.body.data).not.toHaveProperty('conversationId');
  });

  it('content 为空字符串返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({ content: '' });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('缺少 content 字段返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({});
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('content 超过 2000 字返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({ content: 'x'.repeat(2001) });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('缺少 scope 返回 403 FORBIDDEN_SCOPE', async () => {
    const body = JSON.stringify({ content: 'test question' });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecretNoScope, appIdNoScope)).send(body);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_SCOPE');
  });
});
