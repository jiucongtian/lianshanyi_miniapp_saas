import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import { connectTestDb, disconnectTestDb } from './helpers/db';
import { Tenant } from '../../src/models/tenant.model';
import { User } from '../../src/models/user.model';
import { Feedback } from '../../src/models/feedback.model';
import { OpenApiLog } from '../../src/models/open-api-log.model';
import { signAccessToken } from '../../src/lib/crypto/jwt';

const SLUG = 'admin-dashboard-test';
let tenantId: string;
let adminToken: string;
let normalUserId: string;

async function cleanup() {
  const t = await Tenant.findOne({ slug: SLUG });
  if (t) {
    await User.deleteMany({ tenantId: t._id });
    await Feedback.deleteMany({ tenantId: String(t._id) });
    await OpenApiLog.deleteMany({ appId: 'test-app-dash' });
    await t.deleteOne();
  }
}

beforeAll(async () => {
  await connectTestDb();
  await cleanup();

  const tenant = await Tenant.create({
    type: 'tenant', slug: SLUG, name: 'Dashboard Test',
    status: 'active', plan: 'basic', themeConfig: {}, aiConfig: { provider: 'mock' },
    limits: { maxUsers: 100 },
  });
  tenantId = String(tenant._id);

  const hash = await bcrypt.hash('Admin@1234', 10);
  const admin = await User.create({
    tenantId, username: 'dash_admin', passwordHash: hash, isAdmin: true, userType: 'normal',
  });
  const normal = await User.create({
    tenantId, username: 'dash_user', passwordHash: hash, isAdmin: false, userType: 'normal',
  });
  normalUserId = normal._id.toString();

  adminToken = signAccessToken({
    userId: admin._id.toString(), tenantId,
    userType: 'admin', isAdmin: true, isGuest: false,
  });

  // Seed feedbacks
  await Feedback.create([
    { tenantId, userId: normalUserId, content: '反馈1', status: 'pending' },
    { tenantId, userId: normalUserId, content: '反馈2', status: 'reviewed' },
  ]);

  // Seed API logs
  await OpenApiLog.create([
    { appId: 'test-app-dash', path: '/openapi/v1/bazi/calculate', method: 'POST', statusCode: 200, latencyMs: 100 },
    { appId: 'test-app-dash', path: '/openapi/v1/bazi/calculate', method: 'POST', statusCode: 500, latencyMs: 3000 },
    { appId: 'test-app-dash', path: '/openapi/v1/tutor-chat', method: 'POST', statusCode: 200, latencyMs: 2000 },
  ]);
});

afterAll(async () => {
  await cleanup();
  await disconnectTestDb();
});

// ── 4.3 Account management ────────────────────────────────────────────────────

describe('PATCH /api/v1/admin/accounts/:id', () => {
  it('可以更新租户限流配置', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/accounts')
      .set('Authorization', `Bearer ${adminToken}`);

    const account = listRes.body.data.accounts.find((a: { name: string }) => a.name === 'Dashboard Test');
    expect(account).toBeDefined();

    const res = await request(app)
      .patch(`/api/v1/admin/accounts/${account._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ limits: { maxUsers: 50, aiCallsPerDay: 2000 }, ipWhitelist: ['1.2.3.4'] });

    expect(res.status).toBe(200);
    expect(res.body.data.limits.maxUsers).toBe(50);
    expect(res.body.data.ipWhitelist).toContain('1.2.3.4');
  });

  it('suspended 状态后账户列表可查到该状态', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/accounts')
      .set('Authorization', `Bearer ${adminToken}`);
    const account = listRes.body.data.accounts.find((a: { name: string }) => a.name === 'Dashboard Test');

    await request(app)
      .patch(`/api/v1/admin/accounts/${account._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    const res = await request(app)
      .get(`/api/v1/admin/accounts/${account._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data.status).toBe('suspended');
  });
});

// ── 5.3 Users & feedbacks ──────────────────────────────────────────────────

describe('GET /api/v1/admin/users', () => {
  it('可按用户名搜索', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users?search=dash_user')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const found = res.body.data.users.some((u: { username: string }) => u.username === 'dash_user');
    expect(found).toBe(true);
  });
});

describe('PATCH /api/v1/admin/users/:userId/type', () => {
  it('修改用户类型为 premium', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${normalUserId}/type`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userType: 'premium' });

    expect(res.status).toBe(200);
    expect(res.body.data.userType).toBe('premium');
  });
});

describe('GET /api/v1/admin/feedbacks', () => {
  it('不带状态过滤返回所有', async () => {
    const res = await request(app)
      .get('/api/v1/admin/feedbacks')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('按 pending 过滤只返回待处理', async () => {
    const res = await request(app)
      .get('/api/v1/admin/feedbacks?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    for (const fb of res.body.data.feedbacks) {
      expect(fb.status).toBe('pending');
    }
  });
});

describe('POST /api/v1/admin/feedbacks/:tenantId/:feedbackId/review', () => {
  it('标记反馈已处理', async () => {
    const listRes = await request(app)
      .get(`/api/v1/admin/feedbacks?status=pending`)
      .set('Authorization', `Bearer ${adminToken}`);

    const fb = listRes.body.data.feedbacks[0];
    const res = await request(app)
      .post(`/api/v1/admin/feedbacks/${tenantId}/${fb._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reply: '已收到，感谢反馈！' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('reviewed');
    expect(res.body.data.adminReply).toBe('已收到，感谢反馈！');
  });
});

// ── 6.4 Logs & dashboard ──────────────────────────────────────────────────

describe('GET /api/v1/admin/logs', () => {
  it('按 appId 过滤日志', async () => {
    const res = await request(app)
      .get('/api/v1/admin/logs?appId=test-app-dash')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.meta.total).toBe(3);
    for (const log of res.body.data.logs) {
      expect(log.appId).toBe('test-app-dash');
    }
  });

  it('按状态码过滤', async () => {
    const res = await request(app)
      .get('/api/v1/admin/logs?appId=test-app-dash&statusCode=200')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    for (const log of res.body.data.logs) {
      expect(log.statusCode).toBe(200);
    }
  });
});

describe('GET /api/v1/admin/dashboard/usage', () => {
  it('返回按 appId+path 聚合的用量', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/usage?appId=test-app-dash')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const baziBucket = res.body.data.find((d: { _id: { path: string } }) =>
      d._id.path === '/openapi/v1/bazi/calculate',
    );
    expect(baziBucket).toBeDefined();
    expect(baziBucket.total).toBe(2);
    expect(baziBucket.success).toBe(1);
  });
});

describe('GET /api/v1/admin/dashboard/overview', () => {
  it('返回运营概览数据结构', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('apiCalls.total');
    expect(res.body.data).toHaveProperty('cardDraws.total');
    expect(res.body.data).toHaveProperty('dailyInsights.total');
  });
});
