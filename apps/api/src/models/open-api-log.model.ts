import mongoose, { Document, Schema } from 'mongoose';

export interface IOpenApiLog extends Document {
  _id: mongoose.Types.ObjectId;
  appId?: string;
  contextId?: string;
  path: string;
  scope?: string;
  statusCode: number;
  code?: string;
  latencyMs: number;
  createdAt: Date;
}

const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

const openApiLogSchema = new Schema<IOpenApiLog>(
  {
    appId: { type: String, index: true },
    contextId: { type: String, index: true },
    path: { type: String, required: true },
    scope: { type: String },
    statusCode: { type: Number, required: true },
    code: { type: String },
    latencyMs: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now, expires: TTL_SECONDS },
  },
  { timestamps: false },
);

export const OpenApiLog = mongoose.model<IOpenApiLog>('OpenApiLog', openApiLogSchema);
