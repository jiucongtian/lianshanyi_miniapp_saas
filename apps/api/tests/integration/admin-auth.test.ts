import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app';
import { connectTestDb, disconnectTestDb } from './helpers/db';
import { Tenant } from '../../src/models/tenant.model';
import { User } from '../../src/models/user.model';
import { signAccessToken } from '../../src/lib/crypto/jwt';

const SLUG = 'admin-auth-test';
let tenantId: string;
let adminToken: string;
let normalToken: string;

async function cleanup() {
  const t = await Tenant.findOne({ slug: SLUG });
  if (t) {
    await User.deleteMany({ tenantId: t._id });
    await t.deleteOne();
  }
}

beforeAll(async () => {
  await connectTestDb();
  await cleanup();

  const tenant = await Tenant.create({
    type: 'tenant',
    slug: SLUG,
    name: 'Admin Auth Test Tenant',
    status: 'active',
    plan: 'basic',
    themeConfig: {},
    aiConfig: { provider: 'mock' },
    limits: { maxUsers: 10 },
  });
  tenantId = String(tenant._id);

  const hash = await bcrypt.hash('Admin@1234', 10);

  const adminUser = await User.create({
    tenantId,
    username: 'test_admin',
    passwordHash: hash,
    isAdmin: true,
    userType: 'normal',
  });

  const normalUser = await User.create({
    tenantId,
    username: 'test_normal',
    passwordHash: hash,
    isAdmin: false,
    userType: 'normal',
  });

  adminToken = signAccessToken({
    userId: adminUser._id.toString(),
    tenantId,
    userType: 'admin',
    isAdmin: true,
    isGuest: false,
  });

  normalToken = signAccessToken({
    userId: normalUser._id.toString(),
    tenantId,
    userType: 'user',
    isAdmin: false,
    isGuest: false,
  });
});

afterAll(async () => {
  await cleanup();
  await disconnectTestDb();
});

// ── POST /admin/auth/login ────────────────────────────────────────────────────

describe('POST /api/v1/admin/auth/login', () => {
  it('管理员用正确密码登录，返回 accessToken', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ usernameOrPhone: 'test_admin', password: 'Admin@1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.isAdmin).toBe(true);
  });

  it('普通用户尝试管理员登录，返回 401（账号存在但非管理员）', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ usernameOrPhone: 'test_normal', password: 'Admin@1234' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('密码错误返回 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ usernameOrPhone: 'test_admin', password: 'WrongPass' });

    expect(res.status).toBe(401);
  });
});

// ── requireAdmin middleware ────────────────────────────────────────────────────

describe('requireAdmin 中间件', () => {
  it('无 token 访问受保护路由，返回 401', async () => {
    const res = await request(app).get('/api/v1/admin/ai-config');
    expect(res.status).toBe(401);
  });

  it('普通用户 token 访问受保护路由，返回 403 FORBIDDEN_ADMIN', async () => {
    const res = await request(app)
      .get('/api/v1/admin/ai-config')
      .set('Authorization', `Bearer ${normalToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_ADMIN');
  });

  it('管理员 token 访问受保护路由，通过（200）', async () => {
    const res = await request(app)
      .get('/api/v1/admin/ai-config')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ── PUT /admin/auth/password ────────────────────────────────────────────────

describe('PUT /api/v1/admin/auth/password', () => {
  it('无 token 返回 401', async () => {
    const res = await request(app)
      .put('/api/v1/admin/auth/password')
      .send({ oldPassword: 'Admin@1234', newPassword: 'NewPass@5678' });
    expect(res.status).toBe(401);
  });

  it('管理员可以修改密码', async () => {
    const res = await request(app)
      .put('/api/v1/admin/auth/password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oldPassword: 'Admin@1234', newPassword: 'NewAdmin@5678' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 改回来，不影响其他测试
    await request(app)
      .put('/api/v1/admin/auth/password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oldPassword: 'NewAdmin@5678', newPassword: 'Admin@1234' });
  });
});
