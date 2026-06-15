import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import profileRoutes from './profile.routes';
import cardRoutes from './card.routes';
import dailyInsightRoutes from './daily-insight.routes';
import assistantRoutes from './assistant.routes';
import feedbackRoutes from './feedback.routes';
import tenantRoutes from './tenant.routes';
import openAppRoutes from './open-app.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/tenants', tenantRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profiles', profileRoutes);
router.use('/cards', cardRoutes);
router.use('/daily-insight', dailyInsightRoutes);
router.use('/assistant', assistantRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/open-apps', openAppRoutes);

export default router;
