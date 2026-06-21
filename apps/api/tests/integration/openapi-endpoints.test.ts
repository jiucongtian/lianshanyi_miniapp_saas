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

  const full = await svc.createApp({
    name: 'Full Scope App',
    accountId,
    scopes: ['bazi:calculate', 'tutor:chat', 'insight:interpret', 'daily-insight:read'],
  });
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
  return {
    'Content-Type': 'application/json',
    'X-App-Id': id,
    ...signRequest({ appSecret: secret, method, path, body }),
  };
}

function getHdrs(path: string, secret: string, id: string) {
  return {
    'X-App-Id': id,
    ...signRequest({ appSecret: secret, method: 'GET', path, body: '' }),
  };
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
    expect(d).toHaveProperty('monthPillar.stem');
    expect(d).toHaveProperty('dayPillar.stem');
    expect(d).toHaveProperty('hourPillar.stem');
    expect(d).toHaveProperty('wuXingCount');
    expect(Object.values(d.wuXingCount as Record<string, number>).reduce((a, b) => a + b, 0)).toBe(8);
    expect(d).not.toHaveProperty('raw');
  });

  it('农历日期成功计算，返回 lunarDate', async () => {
    const body = JSON.stringify({ year: 1990, month: 7, day: 25, hour: 14, isLunar: true });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('lunarDate');
  });

  it('公历请求不返回 lunarDate', async () => {
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('lunarDate');
  });

  it('缺少必填字段 day 返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({ year: 1990, month: 8 });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('年份超出范围（1800）返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({ year: 1800, month: 1, day: 1, hour: 0 });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('缺少 bazi:calculate scope 返回 403 FORBIDDEN_SCOPE', async () => {
    const body = JSON.stringify({ year: 1990, month: 8, day: 15, hour: 14 });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecretNoScope, appIdNoScope)).send(body);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_SCOPE');
  });
});

// ── tutor-chat ────────────────────────────────────────────────────────────────

describe('POST /openapi/v1/tutor-chat', () => {
  const PATH = '/openapi/v1/tutor-chat';

  it('首轮问答成功，返回 reply 和 conversationId', async () => {
    const body = JSON.stringify({ content: '请介绍一下庚午日柱的特点' });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reply');
    expect(res.body.data).toHaveProperty('conversationId');
    expect(typeof res.body.data.conversationId).toBe('string');
    expect(res.body.data.conversationId.length).toBeGreaterThan(0);
  });

  it('多轮对话传入 conversationId，返回相同 conversationId', async () => {
    const body1 = JSON.stringify({ content: '庚午日柱的优势是什么' });
    const res1 = await request(app).post(PATH).set(hdrs('POST', PATH, body1, appSecret, appId)).send(body1);
    expect(res1.status).toBe(200);
    const convId = res1.body.data.conversationId as string;

    const body2 = JSON.stringify({ content: '那劣势呢', conversationId: convId });
    const res2 = await request(app).post(PATH).set(hdrs('POST', PATH, body2, appSecret, appId)).send(body2);
    expect(res2.status).toBe(200);
    expect(res2.body.data.conversationId).toBe(convId);
  });

  it('content 为空返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({ content: '' });
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

  it('缺少 tutor:chat scope 返回 403 FORBIDDEN_SCOPE', async () => {
    const body = JSON.stringify({ content: '测试问题' });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecretNoScope, appIdNoScope)).send(body);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_SCOPE');
  });
});

// ── card-insight ──────────────────────────────────────────────────────────────

describe('POST /openapi/v1/card-insight', () => {
  const PATH = '/openapi/v1/card-insight';

  const validBody = {
    cardName: '庚午',
  };

  it('成功返回 interpretation', async () => {
    const body = JSON.stringify(validBody);
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('interpretation');
    expect(typeof res.body.data.interpretation).toBe('string');
    expect(res.body.data.interpretation.length).toBeGreaterThan(0);
  });

  it('带可选 question 字段成功返回', async () => {
    const body = JSON.stringify({ ...validBody, question: '今年适合创业吗？' });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('interpretation');
  });

  it('缺少 cardName 返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({});
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('question 超过 200 字返回 400 VALIDATION_ERROR', async () => {
    const body = JSON.stringify({ ...validBody, question: 'q'.repeat(201) });
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecret, appId)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('缺少 insight:interpret scope 返回 403 FORBIDDEN_SCOPE', async () => {
    const body = JSON.stringify(validBody);
    const res = await request(app).post(PATH).set(hdrs('POST', PATH, body, appSecretNoScope, appIdNoScope)).send(body);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_SCOPE');
  });
});

// ── daily-insight ─────────────────────────────────────────────────────────────

describe('GET /openapi/v1/daily-insight', () => {
  const PATH = '/openapi/v1/daily-insight';

  const validQs = { date: '2026-06-15', cardName: '庚午' };

  it('成功返回每日愈见完整字段', async () => {
    const res = await request(app).get(PATH).query(validQs).set(getHdrs(PATH, appSecret, appId));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d).toHaveProperty('title');
    expect(d).toHaveProperty('summary');
    expect(d).toHaveProperty('fullText');
    expect(d).toHaveProperty('luckyDirection');
    expect(d).toHaveProperty('luckyColor');
    expect(d).toHaveProperty('luckyNumber');
  });

  it('缺少 date 返回 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get(PATH).query({ cardName: '庚午' }).set(getHdrs(PATH, appSecret, appId));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('date 格式非法返回 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get(PATH).query({ ...validQs, date: '20260615' }).set(getHdrs(PATH, appSecret, appId));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('缺少 daily-insight:read scope 返回 403 FORBIDDEN_SCOPE', async () => {
    const res = await request(app).get(PATH).query(validQs).set(getHdrs(PATH, appSecretNoScope, appIdNoScope));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_SCOPE');
  });
});

// ── 旧 /ai/chat 已移除 ────────────────────────────────────────────────────────

describe('旧接口兼容性', () => {
  it('POST /openapi/v1/ai/chat 已移除，返回 404', async () => {
    const body = JSON.stringify({ content: 'test' });
    const res = await request(app).post('/openapi/v1/ai/chat').set(hdrs('POST', '/openapi/v1/ai/chat', body, appSecret, appId)).send(body);
    expect(res.status).toBe(404);
  });
});
