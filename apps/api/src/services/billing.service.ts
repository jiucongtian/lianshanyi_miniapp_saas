import mongoose from 'mongoose';
import { billingRepo, type BillingFilter } from '../repos/billing.repo';
import type { BillingProduct } from '../models/billing-rate.model';

export const billingService = {
  listRates: () => billingRepo.listRates(),
  setRate: (product: BillingProduct, priceFen: number) => billingRepo.setRate(product, priceFen),
  start: (appId: string, accountId: string, accountName: string, product: BillingProduct) =>
    billingRepo.start(appId, accountId, accountName, product),
  async succeed(id: mongoose.Types.ObjectId, product: BillingProduct, provider: 'coze' | 'mock') {
    const rate = provider === 'coze' ? await billingRepo.getRate(product) : null;
    const status = provider === 'mock' ? 'free' : !rate ? 'unpriced' : rate.priceFen === 0 ? 'free' : 'charged';
    const entry = await billingRepo.finish(id, status, provider, rate?.priceFen);
    if (!entry) throw new Error('账单记录状态异常');
    return entry;
  },
  async fail(id: mongoose.Types.ObjectId) {
    const entry = await billingRepo.finish(id, 'failed');
    if (!entry) throw new Error('账单记录状态异常');
  },
  list: (filter: BillingFilter, page: number, limit: number) => billingRepo.list(filter, page, limit),
  summary: (filter: BillingFilter) => billingRepo.summary(filter),
};
