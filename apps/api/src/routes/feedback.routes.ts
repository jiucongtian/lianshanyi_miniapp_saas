import { Router } from 'express';
import { feedbackController } from '../controllers/feedback.controller';
import { optionalAuth, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Anyone (including unauthenticated) can submit feedback
router.post('/', optionalAuth, feedbackController.submitFeedback);

// Admin only
router.get('/', requireAdmin, feedbackController.listFeedbacks);
router.post('/:id/reply', requireAdmin, feedbackController.replyFeedback);

export default router;
