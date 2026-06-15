import mongoose, { Document, Schema } from 'mongoose';

export interface ITenantThemeConfig {
  brandName: string;
  logoUrl?: string;
  primaryColor: string;
  bgColor: string;
  cardBgColor: string;
  buttonColor: string;
  copy: {
    homeTitle: string;
    homeSubtitle: string;
    drawButtonText: string;
    inputPlaceholder: string;
    tabInsight: string;
    tabDaily: string;
  };
  features: {
    showDailyInsight: boolean;
    showAssistant: boolean;
    requireLogin: boolean;
  };
}

export interface ITenant extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'tenant' | 'partner';
  slug: string;
  name: string;
  status: 'trial' | 'active' | 'suspended';
  plan: 'trial' | 'basic' | 'pro';
  themeConfig: ITenantThemeConfig;
  aiConfig: {
    provider: 'mock' | 'coze';
    botId?: string;
  };
  limits: {
    maxUsers: number;
    aiCallsPerDay?: number;
  };
  ipWhitelist?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Account is the unified context model; tenant and partner are both Accounts. */
export type IAccount = ITenant;

const themeConfigSchema = new Schema<ITenantThemeConfig>(
  {
    brandName: { type: String, required: true, default: '连山易' },
    logoUrl: { type: String },
    primaryColor: { type: String, required: true, default: '#8B4513' },
    bgColor: { type: String, required: true, default: '#FFF8F0' },
    cardBgColor: { type: String, required: true, default: '#FFFDF8' },
    buttonColor: { type: String, required: true, default: '#8B4513' },
    copy: {
      homeTitle: { type: String, default: '智慧洞见' },
      homeSubtitle: { type: String, default: 'Wisdom and Insight' },
      drawButtonText: { type: String, default: '抽卡寻找答案' },
      inputPlaceholder: { type: String, default: '说出你的问题，实在没有空着也行！' },
      tabInsight: { type: String, default: '智慧洞见' },
      tabDaily: { type: String, default: '每日愈见' },
    },
    features: {
      showDailyInsight: { type: Boolean, default: true },
      showAssistant: { type: Boolean, default: true },
      requireLogin: { type: Boolean, default: false },
    },
  },
  { _id: false },
);

const tenantSchema = new Schema<ITenant>(
  {
    type: {
      type: String,
      enum: ['tenant', 'partner'],
      default: 'tenant',
    },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['trial', 'active', 'suspended'],
      default: 'trial',
    },
    plan: {
      type: String,
      enum: ['trial', 'basic', 'pro'],
      default: 'trial',
    },
    themeConfig: { type: themeConfigSchema, default: () => ({}) },
    aiConfig: {
      provider: { type: String, enum: ['mock', 'coze'], default: 'mock' },
      botId: { type: String },
    },
    limits: {
      maxUsers: { type: Number, default: 1000 },
      aiCallsPerDay: { type: Number },
    },
    ipWhitelist: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret['__v'];
        return ret;
      },
    },
  },
);

export const Tenant = mongoose.model<ITenant>('Tenant', tenantSchema);
export const Account = Tenant;
