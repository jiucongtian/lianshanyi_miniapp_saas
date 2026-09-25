import mongoose, { Schema } from 'mongoose';

export const BILLING_PRODUCTS = ['card-insight', 'daily-insight', 'tutor-chat'] as const;
export type BillingProduct = (typeof BILLING_PRODUCTS)[number];

export interface IBillingRate {
  product: BillingProduct;
  priceFen: number;
  updatedAt: Date;
}

const billingRateSchema = new Schema<IBillingRate>({
  product: { type: String, enum: BILLING_PRODUCTS, required: true, unique: true },
  priceFen: { type: Number, required: true, min: 0 },
  updatedAt: { type: Date, required: true, default: Date.now },
});

export const BillingRate = mongoose.model<IBillingRate>('BillingRate', billingRateSchema);
