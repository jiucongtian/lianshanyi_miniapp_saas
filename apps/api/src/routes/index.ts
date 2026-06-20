import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import type { RedisClientType } from 'redis';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import profileRoutes from './profile.routes';
import cardRoutes from './card.routes';
import dailyInsightRoutes from './daily-insight.routes';
import assistantRoutes from './assistant.routes';
import feedbackRoutes from './feedback.routes';
import tenantRoutes from './tenant.routes';
import adminRoutes from './admin/index';

const router = Router();

/**
 * Readiness probe — verifies the instance can actually serve traffic.
 * Mongo is required (returns 503 if down); Redis is optional and reported
 * for visibility only (the app degrades gracefully without it).
 */
router.get('/health', async (req: Request, res: Response) => {
  const mongoUp = mongoose.connection.readyState === 1;

  let redisStatus: 'up' | 'down' | 'disabled' = 'disabled';
  const redis = req.app.locals['redis'] as RedisClientType | undefined;
  if (redis) {
    try {
      await redis.ping();
      redisStatus = 'up';
    } catch {
      redisStatus = 'down';
    }
  }

  res.status(mongoUp ? 200 : 503).json({
    status: mongoUp ? 'ok' : 'degraded',
    mongo: mongoUp ? 'up' : 'down',
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

router.use('/tenants', tenantRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/profiles', profileRoutes);
router.use('/cards', cardRoutes);
router.use('/daily-insight', dailyInsightRoutes);
router.use('/assistant', assistantRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/admin', adminRoutes);

export default router;
