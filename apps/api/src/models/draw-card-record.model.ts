import mongoose, { Document, Schema } from 'mongoose';

export interface IDrawCardRecord extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileId?: mongoose.Types.ObjectId;
  cardId: number; // 1-60 (60 jiazi)
  cardName: string;
  question?: string;
  aiInterpretation?: string;
  aiProvider: 'mock' | 'coze';
  drawDate: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const drawCardRecordSchema = new Schema<IDrawCardRecord>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'Profile' },
    cardId: { type: Number, required: true, min: 1, max: 60 },
    cardName: { type: String, required: true },
    question: { type: String, maxlength: 500 },
    aiInterpretation: { type: String },
    aiProvider: { type: String, enum: ['mock', 'coze'], default: 'mock' },
    drawDate: { type: String, required: true, index: true }, // YYYY-MM-DD
  },
  { timestamps: true },
);

drawCardRecordSchema.index({ tenantId: 1, userId: 1, drawDate: 1 });

export const DrawCardRecord = mongoose.model<IDrawCardRecord>(
  'DrawCardRecord',
  drawCardRecordSchema,
);
