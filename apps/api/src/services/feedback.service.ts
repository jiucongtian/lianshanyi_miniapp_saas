import mongoose from 'mongoose';
import { IFeedback, FeedbackStatus } from '../models/feedback.model';
import { FeedbackRepo } from '../repos';
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
    const repo = new FeedbackRepo(tenantId);
    const feedback = await repo.create({
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
    const repo = new FeedbackRepo(tenantId);
    const filter = status ? { status: status as FeedbackStatus } : {};

    const [feedbacks, total] = await Promise.all([
      repo.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      repo.countDocuments(filter),
    ]);

    return { feedbacks, meta: paginationMeta(total, page, limit) };
  },

  async replyFeedback(tenantId: string, feedbackId: string, reply: string): Promise<IFeedback> {
    const repo = new FeedbackRepo(tenantId);
    const feedback = await repo.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(feedbackId) },
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
