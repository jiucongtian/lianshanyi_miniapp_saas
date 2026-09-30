import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { BillingEntry } from '../../src/models/billing-entry.model';
import { BillingGenerationLock, BillingPeriod, BillingPeriodLine } from '../../src/models/billing-period.model';
import { OpenApiLog } from '../../src/models/open-api-log.model';
import { OpenApp } from '../../src/models/open-app.model';
import { Tenant } from '../../src/models/tenant.model';
import { billingPeriodRepo } from '../../src/repos/billing-period.repo';
import { billingPeriodService } from '../../src/services/billing-period.service';
import { signAccessToken } from '../../src/lib/crypto/jwt';

// This suite deliberately writes billing revisions: require an isolated database.
const uri = process.env.MONGO_URI ?? '';
const accountId = new mongoose.Types.ObjectId();
const appId = 'app_billing_period_release_test';
const from = new Date('2026-07-31T16:00:00Z');
const to = new Date('2026-08-31T16:00:00Z');
const prices = { 'card-insight': 100, 'daily-insight': 200, 'tutor-chat': 300 };
const at = new Date('2026-08-10T00:00:00Z');
const token = signAccessToken({ userId: new mongoose.Types.ObjectId().toString(), tenantId: '', userType: 'premium', isAdmin: true, isGuest: false });

beforeAll(async () => {
  if (!/^lianshanyi_billing_release_test_[a-z0-9_]+$/.test(new URL(uri).pathname.slice(1))) {
    throw new Error('Billing period integration tests require an isolated release-test database');
  }
  await mongoose.connect(uri);
  await Promise.all([BillingPeriod.init(), BillingPeriodLine.init(), BillingGenerationLock.init()]);
  await Tenant.collection.insertOne({ _id: accountId, name: '账期验收账户', slug: 'billing-period-release-test', type: 'partner', status: 'active' });
  await OpenApp.collection.insertOne({ appId, accountId, name: '账期验收凭据' });
});

beforeEach(async () => {
  await Promise.all([
    BillingEntry.deleteMany({}), OpenApiLog.deleteMany({}), BillingPeriod.deleteMany({}),
    BillingPeriodLine.deleteMany({}), BillingGenerationLock.deleteMany({}),
  ]);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1 && /^lianshanyi_billing_release_test_[a-z0-9_]+$/.test(mongoose.connection.name)) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

async function seedCalls() {
  const live = await BillingEntry.create({ appId, accountId: accountId.toString(), accountName: '账期验收账户', product: 'card-insight', status: 'charged', provider: 'coze', priceFen: 999, amountFen: 999, createdAt: at });
  await BillingEntry.create({ appId, accountId: accountId.toString(), accountName: '账期验收账户', product: 'card-insight', status: 'free', provider: 'mock', amountFen: 0, createdAt: at });
  await OpenApiLog.create([
    { appId, path: '/card-insight', statusCode: 200, latencyMs: 1, createdAt: at },
    { appId, contextId: 'legacy-invalid-context', path: '/openapi/v1/daily-insight', statusCode: 200, latencyMs: 1, createdAt: at },
    { appId, path: '/card-insight', statusCode: 200, billingEntryId: live._id.toString(), latencyMs: 1, createdAt: at },
    { appId, path: '/openapi/v1/daily-insight', statusCode: 401, latencyMs: 0, createdAt: at },
    { appId, path: '/daily-insight', statusCode: 500, latencyMs: 1, createdAt: at },
  ]);
  return live;
}

describe('billing periods with a real MongoDB', () => {
  it('lists bills and deletes all their revisions without deleting source calls, then allows an expanded range', async () => {
    await seedCalls();
    const preview = await billingPeriodService.preview(from, to, prices);
    const period = await billingPeriodService.generate(from, to, prices, preview.fingerprint, 'test');
    await billingPeriodService.generate(from, to, prices, preview.fingerprint, 'test');
    const url = `/api/v1/admin/billing/periods/${period._id}`;
    const headers = { Authorization: `Bearer ${token}` };
    const listing = await request(app).get('/api/v1/admin/billing/periods').set(headers);
    expect(listing.status).toBe(200);
    expect(listing.body.data.meta.total).toBe(1);
    expect(listing.body.data.items[0].activeRevision).toBe(2);
    expect((await request(app).delete(url).query({ revision: 2 })).status).toBe(401);
    const nonAdminToken = signAccessToken({ userId: new mongoose.Types.ObjectId().toString(), tenantId: accountId.toString(), userType: 'premium', isAdmin: false, isGuest: false });
    expect((await request(app).delete(url).set('Authorization', `Bearer ${nonAdminToken}`).query({ revision: 2 })).status).toBe(403);
    expect((await request(app).delete(url).set(headers).query({ revision: 1 })).status).toBe(409);
    expect(await BillingPeriodLine.countDocuments({ periodId: period._id })).toBe(8);
    expect((await request(app).delete(url).set(headers).query({ revision: 2 })).status).toBe(200);
    expect((await request(app).delete(url).set(headers).query({ revision: 2 })).status).toBe(200);
    expect(await BillingPeriodLine.countDocuments({ periodId: period._id })).toBe(0);
    expect((await BillingPeriod.findById(period._id).lean())?.revisions).toEqual([]);
    expect((await BillingPeriod.findById(period._id).lean())?.deletions).toHaveLength(1);
    expect(await OpenApiLog.countDocuments()).toBe(5);
    expect(await BillingEntry.countDocuments()).toBe(2);
    expect((await billingPeriodService.listPeriods(1, 10)).total).toBe(0);
    expect(await billingPeriodService.findByRange(from, to)).toBeNull();
    expect((await request(app).get(`${url}/statement`).set(headers)).status).toBe(404);
    const expandedTo = new Date('2026-09-01T16:00:00Z');
    const expanded = await billingPeriodService.preview(from, expandedTo, prices);
    expect(expanded).toMatchObject({ callCount: 4, amountFen: 400 });
    expect((await billingPeriodService.generate(from, expandedTo, prices, expanded.fingerprint, 'test')).activeRevision).toBe(1);
  });

  it('recreates an identical range with only newly generated revisions and never recovers deleted snapshots', async () => {
    await seedCalls();
    const preview = await billingPeriodService.preview(from, to, prices);
    const period = await billingPeriodService.generate(from, to, prices, preview.fingerprint, 'test');
    await billingPeriodService.remove(period._id, 1, 'test-admin');
    const replacement = await billingPeriodService.generate(from, to, prices, preview.fingerprint, 'test');
    expect(replacement.activeRevision).toBe(2);
    expect(replacement.revisions.map((r) => r.number)).toEqual([2]);
    expect(replacement.deletedAt).toBeUndefined();
    await expect(billingPeriodService.list(period._id, 1, {}, 1, 10)).rejects.toThrow('版本不存在');
    await billingPeriodService.remove(period._id, 2, 'test-admin');
    await Promise.all([OpenApiLog.deleteMany({}), BillingEntry.deleteMany({})]);
    expect(await billingPeriodService.preview(from, to, prices)).toMatchObject({ callCount: 0, retainedCount: 0 });
    expect(await BillingPeriodLine.countDocuments()).toBe(0);
  });

  it('attributes legacy calls, excludes failures and duplicate linked logs, and preserves old revisions on repricing', async () => {
    const live = await seedCalls();
    const preview = await billingPeriodService.preview(from, to, prices);
    expect(preview).toMatchObject({ callCount: 4, historicalCount: 2, skippedCount: 0, amountFen: 400 });
    const first = await billingPeriodService.generate(from, to, prices, preview.fingerprint, 'release-test-admin');
    expect(first.activeRevision).toBe(1);
    const lines = await BillingPeriodLine.find({ periodId: first._id, revision: 1 }).lean();
    expect(lines).toHaveLength(4);
    expect(lines.every((line) => line.accountId === accountId.toString() && line.accountName === '账期验收账户')).toBe(true);
    expect(lines.filter((line) => line.source === 'historical-inferred').every((line) => line.provider === 'coze')).toBe(true);
    expect(lines.find((line) => line.provider === 'mock')?.amountFen).toBe(0);
    await OpenApiLog.deleteMany({});
    const changedPrices = { ...prices, 'card-insight': 250 };
    const requote = await billingPeriodService.preview(from, to, changedPrices);
    expect(requote).toMatchObject({ callCount: 4, retainedCount: 2, amountFen: 700 });
    const second = await billingPeriodService.generate(from, to, changedPrices, requote.fingerprint, 'release-test-admin');
    expect(second.activeRevision).toBe(2);
    expect(second.revisions.map((r) => r.amountFen)).toEqual([400, 700]);
    expect(await BillingPeriodLine.countDocuments({ periodId: first._id, revision: 1 })).toBe(4);
    expect((await BillingEntry.findById(live._id).lean())?.amountFen).toBe(999);
    expect(await BillingGenerationLock.countDocuments()).toBe(0);
    const statement = await request(app).get(`/api/v1/admin/billing/periods/${first._id}/statement`).set('Authorization', `Bearer ${token}`).query({ revision: 1 });
    expect(statement.status).toBe(200);
    expect(statement.body.data.total).toBe(4);
    expect(statement.body.data.summary.reduce((sum: number, row: { amountFen: number }) => sum + row.amountFen, 0)).toBe(400);
  });

  it('blocks anonymous and stale previews without publishing a partial bill', async () => {
    await seedCalls();
    const preview = await billingPeriodService.preview(from, to, prices);
    await OpenApiLog.create({ appId, path: '/card-insight', statusCode: 200, latencyMs: 1, createdAt: at });
    await expect(billingPeriodService.generate(from, to, prices, preview.fingerprint, 'test')).rejects.toThrow('重新预览');
    await OpenApiLog.create({ path: '/card-insight', statusCode: 200, latencyMs: 1, createdAt: at });
    const missing = await billingPeriodService.preview(from, to, prices);
    expect(missing.skippedCount).toBe(1);
    await expect(billingPeriodService.generate(from, to, prices, missing.fingerprint, 'test')).rejects.toThrow('账户归属');
    expect(await BillingPeriod.countDocuments()).toBe(0);
    expect(await BillingPeriodLine.countDocuments()).toBe(0);
    expect(await BillingGenerationLock.countDocuments()).toBe(0);
  });

  it('serializes actual MongoDB generation locks and only lets their owner release them', async () => {
    expect(await billingPeriodRepo.acquireGenerationLock('owner-a')).toBe(true);
    expect(await billingPeriodRepo.acquireGenerationLock('owner-b')).toBe(false);
    await billingPeriodRepo.releaseGenerationLock('owner-b');
    expect(await billingPeriodRepo.acquireGenerationLock('owner-b')).toBe(false);
    await billingPeriodRepo.releaseGenerationLock('owner-a');
    expect(await billingPeriodRepo.acquireGenerationLock('owner-b')).toBe(true);
  });

  it('keeps different periods and prices independent and rejects overlapping dates', async () => {
    await seedCalls();
    const preview = await billingPeriodService.preview(from, to, prices);
    await billingPeriodService.generate(from, to, prices, preview.fingerprint, 'test');
    await expect(billingPeriodService.preview(new Date('2026-08-01T16:00:00Z'), to, prices)).rejects.toThrow('重叠');
    const septemberEnd = new Date('2026-09-30T16:00:00Z');
    await OpenApiLog.create({ appId, path: '/card-insight', statusCode: 200, latencyMs: 1, createdAt: new Date('2026-09-10T00:00:00Z') });
    const september = await billingPeriodService.preview(to, septemberEnd, { ...prices, 'card-insight': 500 });
    const second = await billingPeriodService.generate(to, septemberEnd, { ...prices, 'card-insight': 500 }, september.fingerprint, 'test');
    expect(second.revisions[0].amountFen).toBe(500);
    expect(await BillingPeriod.countDocuments()).toBe(2);
    expect((await BillingPeriod.findOne({ from, to }).lean())?.revisions[0].amountFen).toBe(400);
    expect((await request(app).post('/api/v1/admin/billing/periods/generate').send({})).status).toBe(401);
  });
});
