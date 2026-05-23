import { Request, Response, NextFunction } from 'express';
import { feedbackService } from '../services/feedback.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('FeedbackController');

export const feedbackController = {
  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { content, contactInfo, category } = req.body as {
        content?: unknown;
        contactInfo?: unknown;
        category?: unknown;
      };

      if (!content || typeof content !== 'string' || content.trim() === '') {
        throw new ValidationError('反馈内容不能为空');
      }
      if (content.trim().length < 5) {
        throw new ValidationError('反馈内容至少需要5个字');
      }
      if (content.length > 2000) {
        throw new ValidationError('反馈内容不能超过2000字');
      }

      const feedback = await feedbackService.submitFeedback(req.user?.userId, {
        content: content.trim(),
        contactInfo: contactInfo && typeof contactInfo === 'string' ? contactInfo : undefined,
        category: category && typeof category === 'string' ? category : undefined,
      });

      sendSuccess(res, feedback, 201);
    } catch (err) {
      next(err);
    }
  },

  async listFeedbacks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));
      const status = req.query['status'] ? String(req.query['status']) : undefined;

      const { feedbacks, meta } = await feedbackService.listFeedbacks(page, limit, status);
      sendSuccess(res, feedbacks, 200, meta);
    } catch (err) {
      next(err);
    }
  },

  async replyFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reply } = req.body as { reply?: unknown };

      if (!reply || typeof reply !== 'string' || reply.trim() === '') {
        throw new ValidationError('回复内容不能为空');
      }

      const feedback = await feedbackService.replyFeedback(id!, reply.trim());
      sendSuccess(res, feedback);
    } catch (err) {
      next(err);
    }
  },
};
