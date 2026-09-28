import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { billingPeriodRepo } from '../../src/repos/billing-period.repo';
import { billingPeriodService } from '../../src/services/billing-period.service';
import type { PeriodPrices } from '../../src/models/billing-period.model';

const from = new Date('2026-07-31T16:00:00Z');
const to = new Date('2026-08-31T16:00:00Z');
const accountId = new mongoose.Types.ObjectId().toString();
const appId = 'app_period_test';
const prices: PeriodPrices = { 'card-insight': 100, 'daily-insight': 200, 'tutor-chat': 300 };
const periodId = new mongoose.Types.ObjectId();

function mockSources() {
  vi.spyOn(billingPeriodRepo, 'acquireGenerationLock').mockResolvedValue(true);
  vi.spyOn(billingPeriodRepo, 'releaseGenerationLock').mockResolvedValue({ acknowledged: true, deletedCount: 1 });
  vi.spyOn(billingPeriodRepo, 'findOverlap').mockResolvedValue(null);
  vi.spyOn(billingPeriodRepo, 'findByRange').mockResolvedValue(null);
  vi.spyOn(billingPeriodRepo, 'liveEntries').mockResolvedValue([]);
  vi.spyOn(billingPeriodRepo, 'legacyLogs').mockResolvedValue([
    { _id: new mongoose.Types.ObjectId(), appId, contextId: accountId, path: '/card-insight', createdAt: new Date('2026-08-10T00:00:00Z') },
    { _id: new mongoose.Types.ObjectId(), appId, contextId: accountId, path: '/openapi/v1/daily-insight', createdAt: new Date('2026-08-11T00:00:00Z') },
  ] as Awaited<ReturnType<typeof billingPeriodRepo.legacyLogs>>);
  vi.spyOn(billingPeriodRepo, 'apps').mockResolvedValue([]);
  vi.spyOn(billingPeriodRepo, 'accounts').mockResolvedValue([
    { _id: new mongoose.Types.ObjectId(accountId), name: '测试账户' },
  ] as Awaited<ReturnType<typeof billingPeriodRepo.accounts>>);
  vi.spyOn(billingPeriodRepo, 'priorLines').mockResolvedValue([]);
}

beforeEach(mockSources);
afterEach(() => vi.restoreAllMocks());

describe('historical billing periods', () => {
  it('prices both legacy path forms and records operator-confirmed Coze attribution', async () => {
    const preview = await billingPeriodService.preview(from, to, prices);
    expect(preview).toMatchObject({ callCount: 2, amountFen: 300, historicalCount: 2, skippedCount: 0 });
    expect(preview.byProduct['card-insight']).toEqual({ count: 1, amountFen: 100 });
    expect(preview.byProduct['daily-insight']).toEqual({ count: 1, amountFen: 200 });

    vi.spyOn(billingPeriodRepo, 'create').mockResolvedValue({ toObject: () => ({ _id: periodId, activeRevision: 0 }) } as Awaited<ReturnType<typeof billingPeriodRepo.create>>);
    vi.spyOn(billingPeriodRepo, 'acquireBuild').mockResolvedValue({ _id: periodId } as Awaited<ReturnType<typeof billingPeriodRepo.acquireBuild>>);
    vi.spyOn(billingPeriodRepo, 'clearUnpublishedRevision').mockResolvedValue({ acknowledged: true, deletedCount: 0 });
    const insert = vi.spyOn(billingPeriodRepo, 'insertLines').mockResolvedValue([]);
    vi.spyOn(billingPeriodRepo, 'publish').mockResolvedValue({ _id: periodId, activeRevision: 1 } as Awaited<ReturnType<typeof billingPeriodRepo.publish>>);
    await billingPeriodService.generate(from, to, prices, preview.fingerprint, 'test-admin');
    expect(insert).toHaveBeenCalledOnce();
    const lines = insert.mock.calls[0][0];
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.provider === 'coze' && line.source === 'historical-inferred')).toBe(true);
    expect(lines.map((line) => line.amountFen).sort()).toEqual([100, 200]);
  });

  it('refuses to publish an unattributed historical call instead of silently omitting it', async () => {
    vi.mocked(billingPeriodRepo.legacyLogs).mockResolvedValue([
      { _id: new mongoose.Types.ObjectId(), path: '/card-insight', createdAt: new Date('2026-08-10T00:00:00Z') },
    ] as Awaited<ReturnType<typeof billingPeriodRepo.legacyLogs>>);
    const preview = await billingPeriodService.preview(from, to, prices);
    expect(preview.skippedCount).toBe(1);
    await expect(billingPeriodService.generate(from, to, prices, preview.fingerprint, 'test-admin')).rejects.toThrow('无法确定 App 或账户归属');
  });

  it('can reprice a saved source after the 90-day audit log expires', async () => {
    vi.mocked(billingPeriodRepo.findByRange).mockResolvedValue({ _id: periodId, activeRevision: 1 } as Awaited<ReturnType<typeof billingPeriodRepo.findByRange>>);
    vi.mocked(billingPeriodRepo.legacyLogs).mockResolvedValue([]);
    vi.mocked(billingPeriodRepo.priorLines).mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(), periodId, revision: 1, sourceKey: 'log:old',
        source: 'historical-inferred', appId, accountId, accountName: '测试账户',
        product: 'card-insight', provider: 'coze', createdAt: new Date('2026-08-10T00:00:00Z'),
      },
    ] as Awaited<ReturnType<typeof billingPeriodRepo.priorLines>>);
    const preview = await billingPeriodService.preview(from, to, { ...prices, 'card-insight': 500 });
    expect(preview).toMatchObject({ callCount: 1, amountFen: 500, retainedCount: 1 });
    vi.spyOn(billingPeriodRepo, 'acquireBuild').mockResolvedValue({ _id: periodId } as Awaited<ReturnType<typeof billingPeriodRepo.acquireBuild>>);
    vi.spyOn(billingPeriodRepo, 'clearUnpublishedRevision').mockResolvedValue({ acknowledged: true, deletedCount: 0 });
    const insert = vi.spyOn(billingPeriodRepo, 'insertLines').mockResolvedValue([]);
    const publish = vi.spyOn(billingPeriodRepo, 'publish').mockResolvedValue({ _id: periodId, activeRevision: 2 } as Awaited<ReturnType<typeof billingPeriodRepo.publish>>);
    await billingPeriodService.generate(from, to, { ...prices, 'card-insight': 500 }, preview.fingerprint, 'test-admin');
    expect(insert.mock.calls[0][0][0]).toMatchObject({ revision: 2, sourceKey: 'log:old', amountFen: 500, retainedAfterExpiry: true });
    expect(publish.mock.calls[0][1]).toMatchObject({ number: 2, callCount: 1, amountFen: 500, retainedCount: 1 });
    expect(billingPeriodRepo.clearUnpublishedRevision).toHaveBeenCalledWith(periodId, 2);
  });

  it('keeps prices isolated by selected period', async () => {
    vi.mocked(billingPeriodRepo.legacyLogs).mockImplementation(async (start) => [{
      _id: new mongoose.Types.ObjectId(), appId, contextId: accountId,
      path: '/card-insight', createdAt: start.getTime() === from.getTime()
        ? new Date('2026-08-10T00:00:00Z') : new Date('2026-07-10T00:00:00Z'),
    }] as Awaited<ReturnType<typeof billingPeriodRepo.legacyLogs>>);
    const july = await billingPeriodService.preview(new Date('2026-06-30T16:00:00Z'), from, { ...prices, 'card-insight': 50 });
    const august = await billingPeriodService.preview(from, to, { ...prices, 'card-insight': 500 });
    expect(july.amountFen).toBe(50);
    expect(august.amountFen).toBe(500);
    expect(july.fingerprint).not.toBe(august.fingerprint);
  });

  it('rejects overlapping periods to avoid double billing', async () => {
    vi.mocked(billingPeriodRepo.findOverlap).mockResolvedValue({ _id: periodId } as Awaited<ReturnType<typeof billingPeriodRepo.findOverlap>>);
    await expect(billingPeriodService.preview(from, to, prices)).rejects.toThrow('重叠');
  });
});
