import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { connectTestDb, disconnectTestDb } from './helpers/db';
import { Tenant } from '../../src/models/tenant.model';
import { User } from '../../src/models/user.model';
import { OpenApp } from '../../src/models/open-app.model';
import { BillingEntry } from '../../src/models/billing-entry.model';
import { BillingRate } from '../../src/models/billing-rate.model';
import { billingService } from '../../src/services/billing.service';
import { createApp } from '../../src/services/open-app.service';
import { signRequest } from './helpers/sign';
import { signAccessToken } from '../../src/lib/crypto/jwt';

const SLUG = 'billing-integration-test';
let accountId: string;
let appId: string;
let appSecret: string;
let adminToken: string;

beforeAll(async () => {
  await connectTestDb();
  await Tenant.deleteMany({ slug: SLUG });
  const account = await Tenant.create({
    type: 'partner', slug: SLUG, name: '账单集成测试账户', status: 'active', plan: 'basic',
    themeConfig: {}, aiConfig: { provider: 'mock' }, limits: { maxUsers: 100 },
  });
  accountId = account._id.toString();
  const credential = await createApp({
    name: 'Billing Integration Test', accountId,
    scopes: ['insight:interpret', 'daily-insight:read'],
  });
  appId = credential.app.appId;
  appSecret = credential.appSecret;
  const admin = await User.create({
    tenantId: account._id, username: 'billing-integration-admin', isAdmin: true,
    userType: 'premium', isGuest: false,
  });
  adminToken = signAccessToken({
    userId: admin._id.toString(), tenantId: accountId,
    userType: 'premium', isAdmin: true, isGuest: false,
  });
});

afterAll(async () => {
  await BillingEntry.deleteMany({ appId });
  await BillingRate.deleteMany({ product: 'daily-insight' });
  await OpenApp.deleteMany({ appId });
  await User.deleteMany({ tenantId: accountId });
  await Tenant.deleteMany({ slug: SLUG });
  await disconnectTestDb();
});

function headers(method: string, path: string, body: string) {
  return { 'X-App-Id': appId, ...signRequest({ appSecret, method, path, body }) };
}

describe('AI billing', () => {
  it('does not create a bill for 401 or validation errors', async () => {
    const path = '/openapi/v1/card-insight';
    const unauthorized = await request(app).post(path).set('X-App-Id', appId).send({ cardName: '甲子' });
    expect(unauthorized.status).toBe(401);

    const body = JSON.stringify({ question: '缺少卡牌名称' });
    const invalid = await request(app).post(path).set({ 'Content-Type': 'application/json', ...headers('POST', path, body) }).send(body);
    expect(invalid.status).toBe(400);
    expect(await BillingEntry.countDocuments({ appId })).toBe(0);
  });

  it('records a mock success as free and links the response to its bill', async () => {
    const path = '/openapi/v1/card-insight';
    const body = JSON.stringify({ cardName: '甲子' });
    const res = await request(app).post(path).set({ 'Content-Type': 'application/json', ...headers('POST', path, body) }).send(body);
    expect(res.status).toBe(200);
    const entry = await BillingEntry.findById(res.headers['x-billing-entry-id']).lean();
    expect(entry).toMatchObject({
      appId, accountId, accountName: '账单集成测试账户', product: 'card-insight',
      provider: 'mock', status: 'free', amountFen: 0,
    });
  });

  it('snapshots the configured price for each successful Coze result', async () => {
    await billingService.setRate('daily-insight', 250);
    const first = await billingService.start(appId, accountId, '账单集成测试账户', 'daily-insight');
    await billingService.succeed(first._id, 'daily-insight', 'coze');
    await billingService.setRate('daily-insight', 500);
    const second = await billingService.start(appId, accountId, '账单集成测试账户', 'daily-insight');
    await billingService.succeed(second._id, 'daily-insight', 'coze');

    expect(await BillingEntry.findById(first._id).lean()).toMatchObject({ status: 'charged', priceFen: 250, amountFen: 250 });
    expect(await BillingEntry.findById(second._id).lean()).toMatchObject({ status: 'charged', priceFen: 500, amountFen: 500 });
    const summary = await billingService.summary({ appId, product: 'daily-insight' });
    expect(summary[0]).toMatchObject({ charged: 2, amountFen: 750 });
  });

  it('exposes filtered statement data to admins', async () => {
    const res = await request(app)
      .get('/api/v1/admin/billing/statement')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ appId, product: 'daily-insight' });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.summary[0].amountFen).toBe(750);
    expect(res.body.data.items).toHaveLength(2);
  });
});
