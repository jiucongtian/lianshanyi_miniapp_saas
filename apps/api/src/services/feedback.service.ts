import mongoose from 'mongoose';
import { Feedback, IFeedback, FeedbackStatus } from '../models/feedback.model';
import { NotFoundError } from '../utils/errors';
import { paginationMeta } from '../utils/response';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('FeedbackService');

export interface SubmitFeedbackDto {
  content: string;
  contactInfo?: string;
  category?: string;
}

export const feedbackService = {
  async submitFeedback(
    userId: string | undefined,
    tenantId: string,
    data: SubmitFeedbackDto,
  ): Promise<IFeedback> {
    const feedback = await Feedback.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      content: data.content,
      contactInfo: data.contactInfo,
      category: data.category,
    });

    log.info({ tenantId, feedbackId: feedback._id.toString(), userId }, 'Feedback submitted');
    return feedback;
  },

  async listFeedbacks(
    tenantId: string,
    page: number,
    limit: number,
    status?: string,
  ): Promise<{
    feedbacks: IFeedback[];
    meta: ReturnType<typeof paginationMeta>;
  }> {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
    };
    if (status) {
      query['status'] = status as FeedbackStatus;
    }

    const [feedbacks, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Feedback.countDocuments(query),
    ]);

    return { feedbacks, meta: paginationMeta(total, page, limit) };
  },

  async replyFeedback(tenantId: string, feedbackId: string, reply: string): Promise<IFeedback> {
    const feedback = await Feedback.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(feedbackId), tenantId: new mongoose.Types.ObjectId(tenantId) },
      {
        adminReply: reply,
        status: 'reviewed' as FeedbackStatus,
        repliedAt: new Date(),
      },
      { new: true },
    );

    if (!feedback) throw new NotFoundError('反馈');

    log.info({ tenantId, feedbackId }, 'Feedback replied');
    return feedback;
  },
};
