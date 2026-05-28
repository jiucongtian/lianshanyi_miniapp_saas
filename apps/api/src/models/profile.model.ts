import mongoose, { Document, Schema } from 'mongoose';

export interface IBaziResult {
  // Heavenly Stems & Earthly Branches for Year/Month/Day/Hour pillars
  yearPillar: { stem: string; branch: string; stemWuXing: string; branchWuXing: string };
  monthPillar: { stem: string; branch: string; stemWuXing: string; branchWuXing: string };
  dayPillar: { stem: string; branch: string; stemWuXing: string; branchWuXing: string };
  hourPillar: { stem: string; branch: string; stemWuXing: string; branchWuXing: string };
  // Five elements analysis
  wuXingCount: Record<string, number>;
  dayMasterStrength?: string;
  // Nayin and other derived fields
  nayin?: { year: string; month: string; day: string; hour: string };
  // Raw data
  lunarDate?: string;
  solarTerms?: string;
}

export interface IProfile extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  gender: 'male' | 'female';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number; // 0-23
  birthMinute?: number;
  isLunarDate: boolean;
  isDefaultProfile: boolean;
  baziResult?: IBaziResult;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const baziResultSchema = new Schema(
  {
    yearPillar: {
      stem: String,
      branch: String,
      stemWuXing: String,
      branchWuXing: String,
    },
    monthPillar: {
      stem: String,
      branch: String,
      stemWuXing: String,
      branchWuXing: String,
    },
    dayPillar: {
      stem: String,
      branch: String,
      stemWuXing: String,
      branchWuXing: String,
    },
    hourPillar: {
      stem: String,
      branch: String,
      stemWuXing: String,
      branchWuXing: String,
    },
    wuXingCount: { type: Map, of: Number },
    dayMasterStrength: String,
    nayin: {
      year: String,
      month: String,
      day: String,
      hour: String,
    },
    lunarDate: String,
    solarTerms: String,
  },
  { _id: false },
);

const profileSchema = new Schema<IProfile>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 20 },
    gender: { type: String, enum: ['male', 'female'], required: true },
    birthYear: { type: Number, required: true },
    birthMonth: { type: Number, required: true, min: 1, max: 12 },
    birthDay: { type: Number, required: true, min: 1, max: 31 },
    birthHour: { type: Number, required: true, min: 0, max: 23 },
    birthMinute: { type: Number, min: 0, max: 59 },
    isLunarDate: { type: Boolean, default: false },
    isDefaultProfile: { type: Boolean, default: false },
    baziResult: baziResultSchema,
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

profileSchema.index({ tenantId: 1, userId: 1 });
profileSchema.index({ tenantId: 1, userId: 1, isDefaultProfile: 1 });

export const Profile = mongoose.model<IProfile>('Profile', profileSchema);
