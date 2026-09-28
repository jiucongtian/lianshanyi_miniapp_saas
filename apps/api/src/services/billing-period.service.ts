import { createHash, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { billingPeriodRepo, type PeriodLineFilter } from '../repos/billing-period.repo';
import { type IBillingPeriodLine, type PeriodPrices, type PeriodSource } from '../models/billing-period.model';
import { type BillingProduct } from '../models/billing-rate.model';
import { AppError } from '../utils/errors';

interface Candidate {
  sourceKey: string;
  source: PeriodSource;
  retainedAfterExpiry: boolean;
  appId: string;
  accountId: string;
  accountName: string;
  product: BillingProduct;
  provider: 'coze' | 'mock';
  createdAt: Date;
}

const PRODUCT_BY_PATH: Record<string, BillingProduct> = {
  '/card-insight': 'card-insight',
  '/daily-insight': 'daily-insight',
  '/tutor-chat': 'tutor-chat',
};

async function collect(from: Date, to: Date): Promise<{ candidates: Candidate[]; skippedCount: number }> {
  const period = await billingPeriodRepo.findByRange(from, to);
  const [live, logs, prior] = await Promise.all([
    billingPeriodRepo.liveEntries(from, to),
    billingPeriodRepo.legacyLogs(from, to),
    period?.activeRevision ? billingPeriodRepo.priorLines(period._id, period.activeRevision) : [],
  ]);
  const appIds = [...new Set([...logs, ...live].map((row) => row.appId).filter((id): id is string => Boolean(id)))];
  const apps = await billingPeriodRepo.apps(appIds);
  const appAccounts = new Map(apps.map((app) => [app.appId, app.accountId.toString()]));
  const accountIds = [...new Set([
    ...logs.map((log) => log.contextId && mongoose.isValidObjectId(log.contextId)
      ? log.contextId : (log.appId ? appAccounts.get(log.appId) : undefined)),
    ...live.map((entry) => mongoose.isValidObjectId(entry.accountId)
      ? entry.accountId : appAccounts.get(entry.appId)),
  ].filter((id): id is string => Boolean(id)))];
  const accounts = await billingPeriodRepo.accounts(accountIds);
  const accountNames = new Map(accounts.map((account) => [account._id.toString(), account.name]));
  const candidates = new Map<string, Candidate>();
  let skippedCount = 0;

  for (const entry of live) {
    const accountId = mongoose.isValidObjectId(entry.accountId) ? entry.accountId : appAccounts.get(entry.appId);
    if (!entry.appId || !accountId) { skippedCount++; continue; }
    const provider = entry.provider ?? 'coze'; // Historical entries without a provider follow the operator-confirmed Coze policy.
    const item: Candidate = {
      sourceKey: `entry:${entry._id}`, source: entry.provider ? 'live' : 'historical-inferred', retainedAfterExpiry: false,
      appId: entry.appId, accountId, accountName: entry.accountName || accountNames.get(accountId) || `历史账户 ${accountId}`,
      product: entry.product, provider, createdAt: entry.createdAt,
    };
    candidates.set(item.sourceKey, item);
  }
  for (const log of logs) {
    const product = PRODUCT_BY_PATH[log.path.replace(/^\/openapi\/v1/, '')];
    const accountId = log.contextId && mongoose.isValidObjectId(log.contextId)
      ? log.contextId : (log.appId ? appAccounts.get(log.appId) : undefined);
    if (!product || !log.appId || !accountId) { skippedCount++; continue; }
    const item: Candidate = {
      sourceKey: `log:${log._id}`, source: 'historical-inferred', retainedAfterExpiry: false,
      appId: log.appId, accountId, accountName: accountNames.get(accountId) ?? `历史账户 ${accountId}`,
      product, provider: 'coze', createdAt: log.createdAt,
    };
    candidates.set(item.sourceKey, item);
  }
  // A saved revision survives the audit log's 90-day TTL and can still be repriced.
  for (const line of prior) {
    if (!candidates.has(line.sourceKey)) {
      candidates.set(line.sourceKey, {
        sourceKey: line.sourceKey, source: line.source, retainedAfterExpiry: true,
        appId: line.appId, accountId: line.accountId, accountName: line.accountName,
        product: line.product, provider: line.provider, createdAt: line.createdAt,
      });
    }
  }
  if (candidates.size > 5000) throw new AppError('账期超过 5000 笔，请缩小时间范围', 400, 'BILLING_PERIOD_LIMIT');
  return { candidates: [...candidates.values()].sort((a, b) => a.sourceKey.localeCompare(b.sourceKey)), skippedCount };
}

function quote(candidates: Candidate[], skippedCount: number, from: Date, to: Date, pricesFen: PeriodPrices) {
  const byProduct: Record<BillingProduct, { count: number; amountFen: number }> = {
    'card-insight': { count: 0, amountFen: 0 },
    'daily-insight': { count: 0, amountFen: 0 },
    'tutor-chat': { count: 0, amountFen: 0 },
  };
  let amountFen = 0;
  let historicalCount = 0;
  let retainedCount = 0;
  for (const item of candidates) {
    const amount = item.provider === 'coze' ? pricesFen[item.product] : 0;
    byProduct[item.product].count++;
    byProduct[item.product].amountFen += amount;
    amountFen += amount;
    if (item.source === 'historical-inferred') historicalCount++;
    if (item.retainedAfterExpiry) retainedCount++;
  }
  if (!Number.isSafeInteger(amountFen)) throw new AppError('账单总额超出安全范围', 400, 'BILLING_AMOUNT_LIMIT');
  const fingerprint = createHash('sha256').update(JSON.stringify({
    from: from.toISOString(), to: to.toISOString(), pricesFen,
    sources: candidates.map((item) => [
      item.sourceKey, item.source, item.appId, item.accountId, item.accountName,
      item.product, item.provider, item.createdAt.toISOString(),
    ]),
  })).digest('hex');
  return { callCount: candidates.length, amountFen, historicalCount, retainedCount, skippedCount, byProduct, fingerprint };
}

async function ensureNoOverlap(from: Date, to: Date): Promise<void> {
  if (await billingPeriodRepo.findOverlap(from, to)) {
    throw new AppError('所选时间与已生成账期重叠；请选原账期重算，或使用不重叠的时间段', 409, 'BILLING_PERIOD_OVERLAP');
  }
}

function selectedRevision(period: { activeRevision: number; revisions: { number: number }[] }, revision?: number): number {
  const selected = revision ?? period.activeRevision;
  if (!selected || !period.revisions.some((item) => item.number === selected)) {
    throw new AppError('账单版本不存在', 404, 'BILLING_REVISION_NOT_FOUND');
  }
  return selected;
}

export const billingPeriodService = {
  async findByRange(from: Date, to: Date) {
    const period = await billingPeriodRepo.findByRange(from, to);
    return period?.activeRevision ? period : null;
  },
  async preview(from: Date, to: Date, pricesFen: PeriodPrices) {
    await ensureNoOverlap(from, to);
    const { candidates, skippedCount } = await collect(from, to);
    return quote(candidates, skippedCount, from, to, pricesFen);
  },
  async generate(from: Date, to: Date, pricesFen: PeriodPrices, expectedFingerprint: string, generatedBy: string) {
    const owner = randomUUID();
    if (!await billingPeriodRepo.acquireGenerationLock(owner)) {
      throw new AppError('其他账期正在生成，请稍后再试', 409, 'BILLING_GENERATION_BUSY');
    }
    try {
      await ensureNoOverlap(from, to);
      const { candidates, skippedCount } = await collect(from, to);
      const preview = quote(candidates, skippedCount, from, to, pricesFen);
      if (preview.fingerprint !== expectedFingerprint) {
        throw new AppError('调用数据或单价已变化，请重新预览后生成', 409, 'BILLING_PREVIEW_STALE');
      }
      if (skippedCount > 0) {
        throw new AppError(`有 ${skippedCount} 条成功调用无法确定 App 或账户归属，已停止生成，请先核对数据`, 409, 'BILLING_ACCOUNT_MISSING');
      }
      if (candidates.length === 0) throw new AppError('所选账期没有可计费的成功调用', 400, 'BILLING_PERIOD_EMPTY');

      let period = await billingPeriodRepo.findByRange(from, to);
      if (!period) {
        try { period = (await billingPeriodRepo.create(from, to)).toObject(); }
        catch (error) {
          if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) throw error;
          period = await billingPeriodRepo.findByRange(from, to);
        }
      }
      if (!period) throw new AppError('账期创建失败', 500, 'BILLING_PERIOD_CREATE_FAILED');
      const revision = period.activeRevision + 1;
      if (!await billingPeriodRepo.acquireBuild(period._id, revision)) {
        throw new AppError('账期正在生成，请稍后再试', 409, 'BILLING_PERIOD_BUSY');
      }
      try {
        await billingPeriodRepo.clearUnpublishedRevision(period._id, revision);
        const lines: Omit<IBillingPeriodLine, '_id'>[] = candidates.map((item) => {
          const priceFen = item.provider === 'coze' ? pricesFen[item.product] : 0;
          return {
            periodId: period!._id, revision, ...item,
            status: priceFen > 0 ? 'charged' : 'free', priceFen, amountFen: priceFen,
          };
        });
        await billingPeriodRepo.insertLines(lines);
        const published = await billingPeriodRepo.publish(period._id, {
          number: revision, pricesFen, callCount: preview.callCount,
          amountFen: preview.amountFen, historicalCount: preview.historicalCount,
          retainedCount: preview.retainedCount, skippedCount: preview.skippedCount,
          generatedAt: new Date(), generatedBy,
        });
        if (!published) throw new AppError('账单版本发布失败', 500, 'BILLING_PUBLISH_FAILED');
        return published;
      } catch (error) {
        await billingPeriodRepo.releaseBuild(period._id, revision);
        throw error;
      }
    } finally {
      await billingPeriodRepo.releaseGenerationLock(owner);
    }
  },
  async getById(id: mongoose.Types.ObjectId) {
    const period = await billingPeriodRepo.findById(id);
    if (!period?.activeRevision) throw new AppError('账期不存在', 404, 'BILLING_PERIOD_NOT_FOUND');
    return period;
  },
  async list(id: mongoose.Types.ObjectId, revision: number | undefined, filter: PeriodLineFilter, page: number, limit: number) {
    const period = await this.getById(id);
    return billingPeriodRepo.listLines(id, selectedRevision(period, revision), filter, page, limit);
  },
  async summary(id: mongoose.Types.ObjectId, revision: number | undefined, filter: PeriodLineFilter) {
    const period = await this.getById(id);
    return billingPeriodRepo.summary(id, selectedRevision(period, revision), filter);
  },
};
