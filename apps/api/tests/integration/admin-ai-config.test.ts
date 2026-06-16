import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { connectTestDb, disconnectTestDb } from './helpers/db';
import { Tenant } from '../../src/models/tenant.model';
import { User } from '../../src/models/user.model';
import { AppConfig } from '../../src/models/app-config.model';
import { appConfigService } from '../../src/services/app-config.service';
import { signAccessToken } from '../../src/lib/crypto/jwt';
import bcrypt from 'bcryptjs';

const SLUG = 'admin-ai-config-test';
let tenantId: string;
let adminToken: string;

async function cleanup() {
  const t = await Tenant.findOne({ slug: SLUG });
  if (t) {
    await User.deleteMany({ tenantId: t._id });
    await t.deleteOne();
  }
  await AppConfig.deleteMany({});
  appConfigService.invalidateCache();
}

beforeAll(async () => {
  await connectTestDb();
  await cleanup();

  const tenant = await Tenant.create({
    type: 'tenant', slug: SLUG, name: 'AI Config Test',
    status: 'active', plan: 'basic', themeConfig: {}, aiConfig: { provider: 'mock' },
    limits: { maxUsers: 10 },
  });
  tenantId = String(tenant._id);

  const hash = await bcrypt.hash('Admin@1234', 10);
  const admin = await User.create({
    tenantId, username: 'ai_admin', passwordHash: hash, isAdmin: true, userType: 'normal',
  });

  adminToken = signAccessToken({
    userId: admin._id.toString(), tenantId,
    userType: 'admin', isAdmin: true, isGuest: false,
  });
});

beforeEach(() => { appConfigService.invalidateCache(); });

afterAll(async () => {
  await cleanup();
  await disconnectTestDb();
});

describe('GET /api/v1/admin/ai-config', () => {
  it('无配置时返回默认 mock provider', async () => {
    const res = await request(app)
      .get('/api/v1/admin/ai-config')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.provider).toBe('mock');
  });

  it('Token 已保存时返回掩码（不返回原文）', async () => {
    await request(app)
      .put('/api/v1/admin/ai-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ provider: 'coze', cozeToken: 'sat_test_token_1234567890abcdef' });

    const res = await request(app)
      .get('/api/v1/admin/ai-config')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.data.cozeToken).toBeDefined();
    expect(res.body.data.cozeToken).not.toContain('sat_test_token_1234567890abcdef');
    expect(res.body.data.cozeToken).toContain('****');
  });
});

describe('PUT /api/v1/admin/ai-config', () => {
  it('切换 provider 为 coze 并保存 workflow ID', async () => {
    const res = await request(app)
      .put('/api/v1/admin/ai-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        provider: 'coze',
        cardDrawWorkflowId: 'wf-123',
        dailyInsightWorkflowId: 'wf-456',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.provider).toBe('coze');
    expect(res.body.data.cardDrawWorkflowId).toBe('wf-123');
  });

  it('不传 cozeToken 时不覆盖已有 Token', async () => {
    // 先设 token
    await request(app)
      .put('/api/v1/admin/ai-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ provider: 'coze', cozeToken: 'sat_original_token_abcdef1234567890' });

    // 再只改 provider，不带 token
    await request(app)
      .put('/api/v1/admin/ai-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ provider: 'mock' });

    // 读取 raw 确认 token 还在
    const raw = await appConfigService.getAiConfigRaw();
    expect(raw.cozeTokenEnc).toBeTruthy();
  });

  it('回退到 env var 当 DB 无 token 时', async () => {
    await AppConfig.deleteMany({});
    appConfigService.invalidateCache();
    process.env.COZE_API_TOKEN = 'env_fallback_token';

    const { resolveCozeConfig } = await import('../../src/lib/ai/coze-config');
    const config = await resolveCozeConfig();
    expect(config.token).toBe('env_fallback_token');

    delete process.env.COZE_API_TOKEN;
  });
});
