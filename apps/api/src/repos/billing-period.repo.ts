import mongoose from 'mongoose';
import { BillingEntry } from '../models/billing-entry.model';
import { BillingGenerationLock, BillingPeriod, BillingPeriodLine, type IBillingPeriodLine, type IBillingRevision } from '../models/billing-period.model';
import { OpenApiLog } from '../models/open-api-log.model';
import { OpenApp } from '../models/open-app.model';
import { Tenant } from '../models/tenant.model';
import type { BillingProduct } from '../models/billing-rate.model';

export interface PeriodLineFilter {
  appId?: string;
  accountId?: string;
  product?: BillingProduct;
}

function lineMatch(periodId: mongoose.Types.ObjectId, revision: number, filter: PeriodLineFilter) {
  return {
    periodId, revision,
    ...(filter.appId ? { appId: filter.appId } : {}),
    ...(filter.accountId ? { accountId: filter.accountId } : {}),
    ...(filter.product ? { product: filter.product } : {}),
  };
}

export const billingPeriodRepo = {
  async acquireGenerationLock(owner: string): Promise<boolean> {
    try {
      const now = new Date();
      const lock = await BillingGenerationLock.findOneAndUpdate(
        { _id: 'global', expiresAt: { $lt: now } },
        { $set: { owner, expiresAt: new Date(now.getTime() + 10 * 60_000) } },
        { upsert: true, new: true },
      ).lean();
      return lock?.owner === owner;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) return false;
      throw error;
    }
  },
  releaseGenerationLock: (owner: string) => BillingGenerationLock.deleteOne({ _id: 'global', owner }),
  findByRange: (from: Date, to: Date) => BillingPeriod.findOne({ from, to }).lean(),
  findById: (id: mongoose.Types.ObjectId) => BillingPeriod.findById(id).lean(),
  findOverlap: (from: Date, to: Date) => BillingPeriod.findOne({
    deletedAt: { $exists: false },
    from: { $lt: to }, to: { $gt: from }, $nor: [{ from, to }],
  }).lean(),
  create: (from: Date, to: Date) => BillingPeriod.create({ from, to, activeRevision: 0 }),
  acquireBuild: (id: mongoose.Types.ObjectId, revision: number) => BillingPeriod.findOneAndUpdate(
    {
      _id: id,
      activeRevision: revision - 1,
      $or: [{ buildingRevision: { $exists: false } }, { buildStartedAt: { $lt: new Date(Date.now() - 10 * 60_000) } }],
    },
    { $set: { buildingRevision: revision, buildStartedAt: new Date() } },
    { new: true },
  ).lean(),
  clearUnpublishedRevision: (id: mongoose.Types.ObjectId, revision: number) =>
    BillingPeriodLine.deleteMany({ periodId: id, revision }),
  insertLines: (lines: Omit<IBillingPeriodLine, '_id'>[]) => BillingPeriodLine.insertMany(lines, { ordered: true }),
  publish: (id: mongoose.Types.ObjectId, revision: IBillingRevision) => BillingPeriod.findOneAndUpdate(
    { _id: id, buildingRevision: revision.number, activeRevision: revision.number - 1 },
    { $set: { activeRevision: revision.number }, $unset: { buildingRevision: '', buildStartedAt: '', deletedAt: '' }, $push: { revisions: revision } },
    { new: true },
  ).lean(),
  releaseBuild: (id: mongoose.Types.ObjectId, revision: number) => BillingPeriod.updateOne(
    { _id: id, buildingRevision: revision },
    { $unset: { buildingRevision: '', buildStartedAt: '' } },
  ),
  liveEntries: (from: Date, to: Date) => BillingEntry.find({
    createdAt: { $gte: from, $lt: to },
    status: { $in: ['charged', 'unpriced', 'free'] },
  }).lean(),
  legacyLogs: (from: Date, to: Date) => OpenApiLog.find({
    createdAt: { $gte: from, $lt: to },
    statusCode: 200,
    path: { $in: ['/card-insight', '/daily-insight', '/tutor-chat', '/openapi/v1/card-insight', '/openapi/v1/daily-insight', '/openapi/v1/tutor-chat'] },
    billingEntryId: { $exists: false },
  }).lean(),
  apps: (appIds: string[]) => OpenApp.find({ appId: { $in: appIds } }).select('appId accountId').lean(),
  accounts: (ids: string[]) => Tenant.find({ _id: { $in: ids.filter((id) => mongoose.isValidObjectId(id)) } }).select('_id name').lean(),
  priorLines: (id: mongoose.Types.ObjectId, revision: number) =>
    BillingPeriodLine.find({ periodId: id, revision }).lean(),
  async listPeriods(page: number, limit: number) {
    const filter = { deletedAt: { $exists: false }, activeRevision: { $gt: 0 } };
    const [items, total] = await Promise.all([
      BillingPeriod.find(filter).sort({ from: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      BillingPeriod.countDocuments(filter),
    ]);
    return { items, total };
  },
  removePeriod: (id: mongoose.Types.ObjectId, revision: number, deletedBy: string) => {
    const deletedAt = new Date();
    return BillingPeriod.findOneAndUpdate(
      { _id: id, activeRevision: revision, deletedAt: { $exists: false } },
      { $set: { deletedAt, revisions: [] }, $unset: { buildingRevision: '', buildStartedAt: '' }, $push: { deletions: { revision, deletedAt, deletedBy } } },
      { new: true },
    ).lean();
  },
  deletePeriodLines: (id: mongoose.Types.ObjectId) => BillingPeriodLine.deleteMany({ periodId: id }),
  listLines: async (id: mongoose.Types.ObjectId, revision: number, filter: PeriodLineFilter, page: number, limit: number) => {
    const match = lineMatch(id, revision, filter);
    const [items, total] = await Promise.all([
      BillingPeriodLine.find(match).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      BillingPeriodLine.countDocuments(match),
    ]);
    return { items, total };
  },
  summary: (id: mongoose.Types.ObjectId, revision: number, filter: PeriodLineFilter) =>
    BillingPeriodLine.aggregate<{ _id: BillingProduct; total: number; charged: number; failed: number; unpriced: number; amountFen: number }>([
      { $match: lineMatch(id, revision, filter) },
      { $group: {
        _id: '$product', total: { $sum: 1 },
        charged: { $sum: { $cond: [{ $eq: ['$status', 'charged'] }, 1, 0] } },
        failed: { $sum: 0 }, unpriced: { $sum: 0 }, amountFen: { $sum: '$amountFen' },
      } },
      { $sort: { _id: 1 } },
    ]),
};
