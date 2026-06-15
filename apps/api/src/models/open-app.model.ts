import mongoose, { Document, Schema } from 'mongoose';

export interface IOpenApp extends Document {
  _id: mongoose.Types.ObjectId;
  appId: string;
  secretEnc: string;
  name: string;
  accountId: mongoose.Types.ObjectId;
  scopes: string[];
  status: 'active' | 'disabled';
  rateLimit: {
    windowMs: number;
    max: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const openAppSchema = new Schema<IOpenApp>(
  {
    appId: { type: String, required: true, unique: true, index: true },
    secretEnc: { type: String, required: true },
    name: { type: String, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    scopes: [{ type: String }],
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    rateLimit: {
      windowMs: { type: Number, default: 60_000 },
      max: { type: Number, default: 60 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['__v'];
        delete ret['secretEnc'];
        return ret;
      },
    },
  },
);

export const OpenApp = mongoose.model<IOpenApp>('OpenApp', openAppSchema);
