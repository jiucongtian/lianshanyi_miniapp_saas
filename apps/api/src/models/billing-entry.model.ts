import mongoose, { Schema } from 'mongoose';
import { BILLING_PRODUCTS, type BillingProduct } from './billing-rate.model';

export type BillingStatus = 'pending' | 'charged' | 'free' | 'unpriced' | 'failed';

export interface IBillingEntry {
  _id: mongoose.Types.ObjectId;
  appId: string;
  accountId: string;
  accountName: string;
  product: BillingProduct;
  status: BillingStatus;
  provider?: 'coze' | 'mock';
  priceFen?: number;
  amountFen: number;
  createdAt: Date;
  completedAt?: Date;
}

const billingEntrySchema = new Schema<IBillingEntry>({
  appId: { type: String, required: true, index: true },
  accountId: { type: String, required: true, index: true },
  accountName: { type: String, required: true },
  product: { type: String, enum: BILLING_PRODUCTS, required: true },
  status: { type: String, enum: ['pending', 'charged', 'free', 'unpriced', 'failed'], required: true, default: 'pending' },
  provider: { type: String, enum: ['coze', 'mock'] },
  priceFen: { type: Number, min: 0 },
  amountFen: { type: Number, required: true, min: 0, default: 0 },
  createdAt: { type: Date, required: true, default: Date.now },
  completedAt: { type: Date },
});

billingEntrySchema.index({ createdAt: -1, appId: 1, product: 1 });

export const BillingEntry = mongoose.model<IBillingEntry>('BillingEntry', billingEntrySchema);
