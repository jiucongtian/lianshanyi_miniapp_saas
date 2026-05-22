import { Router } from 'express';
import { dailyInsightController } from '../controllers/daily_insight.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/today', optionalAuth, dailyInsightController.getTodayInsight);
router.get('/date/:date', optionalAuth, dailyInsightController.getInsightByDate);

export default router;
