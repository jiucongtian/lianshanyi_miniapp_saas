import 'dotenv/config';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import app from './app';
import { logger } from './utils/logger';
import { scheduleDailyInsightJob } from './jobs/daily-insight.job';

const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  // ─── MongoDB ──────────────────────────────────────────────────────────────
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not set');

  await mongoose.connect(mongoUri);
  logger.info({ uri: mongoUri.replace(/\/\/[^@]+@/, '//***@') }, 'MongoDB connected');

  // ─── Redis ────────────────────────────────────────────────────────────────
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redis = createClient({ url: redisUrl });
    redis.on('error', (err) => logger.error({ err }, 'Redis error'));
    await redis.connect();
    logger.info('Redis connected');
  }

  // ─── Cron jobs ────────────────────────────────────────────────────────────
  if (process.env.SINGLE_DAILY_INSIGHT_JOB === 'true') {
    scheduleDailyInsightJob();
    logger.info('Daily insight cron job scheduled');
  }

  // ─── HTTP server ──────────────────────────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `API server listening`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
