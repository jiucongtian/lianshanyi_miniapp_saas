import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { feedbackService } from '../../services/feedback.service';
import { Feedback } from '../../models/feedback.model';

export async function listFeedbacks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page = '1', limit = '20', tenantId } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));

    if (tenantId) {
      const { feedbacks, meta } = await feedbackService.listFeedbacks(tenantId, p, l, status);
      res.json({ success: true, data: { feedbacks, meta }, error: null, code: null });
      return;
    }

    // Cross-tenant listing for super admin
    const filter = status ? { status } : {};
    const [feedbacks, total] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      Feedback.countDocuments(filter),
    ]);
    res.json({ success: true, data: { feedbacks, meta: { total, page: p, limit: l } }, error: null, code: null });
  } catch (err) { next(err); }
}

export async function markFeedbackReviewed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reply = '' } = z.object({ reply: z.string().optional() }).parse(req.body);
    const { feedbackId, tenantId } = req.params;
    const feedback = await feedbackService.replyFeedback(tenantId, feedbackId, reply);
    res.json({ success: true, data: feedback, error: null, code: null });
  } catch (err) { next(err); }
}
