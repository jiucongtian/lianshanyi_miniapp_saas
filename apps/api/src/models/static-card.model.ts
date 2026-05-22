import mongoose, { Document, Schema } from 'mongoose';

export interface IStaticCard extends Document {
  _id: mongoose.Types.ObjectId;
  cardId: number; // 1-60
  name: string; // e.g. "甲子"
  heavenlyStem: string; // 天干 e.g. "甲"
  earthlyBranch: string; // 地支 e.g. "子"
  wuXingElement: string; // 五行 e.g. "水"
  nayin: string; // 纳音 e.g. "海中金"
  imageUrl?: string; // MinIO URL
  description?: string;
  keywords?: string[];
  interpretation?: string; // base interpretation text
  sortOrder: number;
}

const staticCardSchema = new Schema<IStaticCard>(
  {
    cardId: { type: Number, required: true, unique: true, min: 1, max: 60 },
    name: { type: String, required: true },
    heavenlyStem: { type: String, required: true },
    earthlyBranch: { type: String, required: true },
    wuXingElement: { type: String, required: true },
    nayin: { type: String, required: true },
    imageUrl: { type: String },
    description: { type: String },
    keywords: [{ type: String }],
    interpretation: { type: String },
    sortOrder: { type: Number, required: true },
  },
  { timestamps: true },
);

export const StaticCard = mongoose.model<IStaticCard>('StaticCard', staticCardSchema);
