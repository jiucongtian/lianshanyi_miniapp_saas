import mongoose from 'mongoose';
import { BillingEntry, type BillingStatus } from '../models/billing-entry.model';
import { BillingRate, type BillingProduct } from '../models/billing-rate.model';

export interface BillingFilter {
  appId?: string;
  accountId?: string;
  product?: BillingProduct;
  from?: Date;
  to?: Date;
}

function toMongoFilter(filter: BillingFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filter.appId) query['appId'] = filter.appId;
  if (filter.accountId) query['accountId'] = filter.accountId;
  if (filter.product) query['product'] = filter.product;
  if (filter.from || filter.to) {
    query['createdAt'] = {
      ...(filter.from ? { $gte: filter.from } : {}),
      ...(filter.to ? { $lt: filter.to } : {}),
    };
  }
  return query;
}

export const billingRepo = {
  listRates: () => BillingRate.find().sort({ product: 1 }).lean(),
  getRate: (product: BillingProduct) => BillingRate.findOne({ product }).lean(),
  setRate: (product: BillingProduct, priceFen: number) => BillingRate.findOneAndUpdate(
    { product },
    { $set: { priceFen, updatedAt: new Date() } },
    { upsert: true, new: true, runValidators: true },
  ).lean(),
  start: (appId: string, accountId: string, accountName: string, product: BillingProduct) =>
    BillingEntry.create({ appId, accountId, accountName, product, status: 'pending', amountFen: 0 }),
  finish: (id: mongoose.Types.ObjectId, status: BillingStatus, provider?: 'coze' | 'mock', priceFen?: number) =>
    BillingEntry.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set: { status, provider, priceFen, amountFen: status === 'charged' ? priceFen : 0, completedAt: new Date() } },
      { new: true, runValidators: true },
    ).lean(),
  list: async (filter: BillingFilter, page: number, limit: number) => {
    const query = toMongoFilter(filter);
    const [items, total] = await Promise.all([
      BillingEntry.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      BillingEntry.countDocuments(query),
    ]);
    return { items, total };
  },
  summary: (filter: BillingFilter) => BillingEntry.aggregate<{
    _id: BillingProduct;
    total: number;
    charged: number;
    failed: number;
    unpriced: number;
    amountFen: number;
  }>([
    { $match: toMongoFilter(filter) },
    { $group: {
      _id: '$product',
      total: { $sum: 1 },
      charged: { $sum: { $cond: [{ $eq: ['$status', 'charged'] }, 1, 0] } },
      failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
      unpriced: { $sum: { $cond: [{ $eq: ['$status', 'unpriced'] }, 1, 0] } },
      amountFen: { $sum: '$amountFen' },
    } },
    { $sort: { _id: 1 } },
  ]),
};
