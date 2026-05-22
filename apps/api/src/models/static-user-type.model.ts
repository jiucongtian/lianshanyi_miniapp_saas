import mongoose, { Document, Schema } from 'mongoose';

export interface IStaticUserType extends Document {
  typeKey: string; // 'guest' | 'normal' | 'student' | 'premium'
  typeName: string;
  description?: string;
  permissions: string[];
  dailyCardDrawLimit: number;
  maxProfiles: number;
  canViewZhiFuPan: boolean;
  canUseAssistant: boolean;
  sortOrder: number;
}

const staticUserTypeSchema = new Schema<IStaticUserType>(
  {
    typeKey: { type: String, required: true, unique: true },
    typeName: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: String }],
    dailyCardDrawLimit: { type: Number, default: 3 },
    maxProfiles: { type: Number, default: 3 },
    canViewZhiFuPan: { type: Boolean, default: false },
    canUseAssistant: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const StaticUserType = mongoose.model<IStaticUserType>(
  'StaticUserType',
  staticUserTypeSchema,
);
