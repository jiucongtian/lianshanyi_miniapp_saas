import mongoose, { Document, Schema } from 'mongoose';

export interface IAiConfig {
  provider: 'mock' | 'coze';
  cozeTokenEnc?: string;
  cardDrawWorkflowId?: string;
  dailyInsightWorkflowId?: string;
  assistantBotId?: string;
}

export interface IAppConfig extends Document {
  _id: mongoose.Types.ObjectId;
  ai: IAiConfig;
  updatedAt: Date;
}

const appConfigSchema = new Schema<IAppConfig>(
  {
    ai: {
      provider: { type: String, enum: ['mock', 'coze'], default: 'mock' },
      cozeTokenEnc: { type: String },
      cardDrawWorkflowId: { type: String },
      dailyInsightWorkflowId: { type: String },
      assistantBotId: { type: String },
    },
  },
  { timestamps: true },
);

export const AppConfig = mongoose.model<IAppConfig>('AppConfig', appConfigSchema);
