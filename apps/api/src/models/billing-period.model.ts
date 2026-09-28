import mongoose, { Schema } from 'mongoose';
import { BILLING_PRODUCTS, type BillingProduct } from './billing-rate.model';

export type PeriodPrices = Record<BillingProduct, number>;
export type PeriodSource = 'live' | 'historical-inferred';

export interface IBillingRevision {
  number: number;
  pricesFen: PeriodPrices;
  callCount: number;
  amountFen: number;
  historicalCount: number;
  retainedCount: number;
  skippedCount: number;
  generatedAt: Date;
  generatedBy: string;
}

export interface IBillingPeriod {
  _id: mongoose.Types.ObjectId;
  from: Date;
  to: Date;
  activeRevision: number;
  buildingRevision?: number;
  buildStartedAt?: Date;
  revisions: IBillingRevision[];
  createdAt: Date;
}

export interface IBillingPeriodLine {
  _id: mongoose.Types.ObjectId;
  periodId: mongoose.Types.ObjectId;
  revision: number;
  sourceKey: string;
  source: PeriodSource;
  retainedAfterExpiry: boolean;
  appId: string;
  accountId: string;
  accountName: string;
  product: BillingProduct;
  provider: 'coze' | 'mock';
  status: 'charged' | 'free';
  priceFen: number;
  amountFen: number;
  createdAt: Date;
}

const pricesSchema = new Schema<PeriodPrices>({
  'card-insight': { type: Number, required: true, min: 0 },
  'daily-insight': { type: Number, required: true, min: 0 },
  'tutor-chat': { type: Number, required: true, min: 0 },
}, { _id: false });

const revisionSchema = new Schema<IBillingRevision>({
  number: { type: Number, required: true },
  pricesFen: { type: pricesSchema, required: true },
  callCount: { type: Number, required: true },
  amountFen: { type: Number, required: true },
  historicalCount: { type: Number, required: true },
  retainedCount: { type: Number, required: true },
  skippedCount: { type: Number, required: true },
  generatedAt: { type: Date, required: true },
  generatedBy: { type: String, required: true },
}, { _id: false });

const periodSchema = new Schema<IBillingPeriod>({
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  activeRevision: { type: Number, required: true, default: 0 },
  buildingRevision: { type: Number },
  buildStartedAt: { type: Date },
  revisions: { type: [revisionSchema], default: [] },
  createdAt: { type: Date, required: true, default: Date.now },
});
periodSchema.index({ from: 1, to: 1 }, { unique: true });

const lineSchema = new Schema<IBillingPeriodLine>({
  periodId: { type: Schema.Types.ObjectId, required: true, index: true },
  revision: { type: Number, required: true },
  sourceKey: { type: String, required: true },
  source: { type: String, enum: ['live', 'historical-inferred'], required: true },
  retainedAfterExpiry: { type: Boolean, required: true, default: false },
  appId: { type: String, required: true },
  accountId: { type: String, required: true },
  accountName: { type: String, required: true },
  product: { type: String, enum: BILLING_PRODUCTS, required: true },
  provider: { type: String, enum: ['coze', 'mock'], required: true },
  status: { type: String, enum: ['charged', 'free'], required: true },
  priceFen: { type: Number, required: true, min: 0 },
  amountFen: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, required: true },
});
lineSchema.index({ periodId: 1, revision: 1, sourceKey: 1 }, { unique: true });
lineSchema.index({ periodId: 1, revision: 1, createdAt: -1 });

export const BillingPeriod = mongoose.model<IBillingPeriod>('BillingPeriod', periodSchema);
export const BillingPeriodLine = mongoose.model<IBillingPeriodLine>('BillingPeriodLine', lineSchema);

export interface IBillingGenerationLock {
  _id: string;
  owner: string;
  expiresAt: Date;
}

const lockSchema = new Schema<IBillingGenerationLock>({
  _id: { type: String, required: true },
  owner: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

export const BillingGenerationLock = mongoose.model<IBillingGenerationLock>('BillingGenerationLock', lockSchema);
