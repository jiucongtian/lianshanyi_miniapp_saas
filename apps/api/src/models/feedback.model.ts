import mongoose, { Document, Schema } from 'mongoose';

export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved';

export interface IFeedback extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  content: string;
  contactInfo?: string;
  category?: string;
  status: FeedbackStatus;
  adminReply?: string;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true, maxlength: 2000 },
    contactInfo: { type: String, maxlength: 100 },
    category: { type: String },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
      index: true,
    },
    adminReply: { type: String },
    repliedAt: { type: Date },
  },
  { timestamps: true },
);

feedbackSchema.index({ tenantId: 1, status: 1 });
feedbackSchema.index({ tenantId: 1, userId: 1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
