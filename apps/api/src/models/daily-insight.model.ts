import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyInsight extends Document {
  _id: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  cardId: number; // 1-60
  cardName: string;
  // Heavenly stem & earthly branch of the day
  dayStem: string;
  dayBranch: string;
  // Daily divination text
  title?: string;
  summary?: string;
  fullText?: string;
  luckyDirection?: string;
  luckyColor?: string;
  luckyNumber?: number;
  aiGenerated: boolean;
  aiProvider: 'mock' | 'coze';
  createdAt: Date;
  updatedAt: Date;
}

const dailyInsightSchema = new Schema<IDailyInsight>(
  {
    date: { type: String, required: true, unique: true, index: true },
    cardId: { type: Number, required: true, min: 1, max: 60 },
    cardName: { type: String, required: true },
    dayStem: { type: String, required: true },
    dayBranch: { type: String, required: true },
    title: { type: String },
    summary: { type: String },
    fullText: { type: String },
    luckyDirection: { type: String },
    luckyColor: { type: String },
    luckyNumber: { type: Number },
    aiGenerated: { type: Boolean, default: false },
    aiProvider: { type: String, enum: ['mock', 'coze'], default: 'mock' },
  },
  { timestamps: true },
);

export const DailyInsight = mongoose.model<IDailyInsight>(
  'DailyInsight',
  dailyInsightSchema,
);
