import 'dotenv/config';
import type { Server } from 'node:http';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import app from './app';
import { logger } from './utils/logger';
import { scheduleDailyInsightJob } from './jobs/daily-insight.job';

const PORT = Number(process.env.PORT ?? 3000);

let redisClient: ReturnType<typeof createClient> | null = null;

async function bootstrap() {
  // ─── MongoDB ──────────────────────────────────────────────────────────────
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI not set');

  await mongoose.connect(mongoUri);
  logger.info({ uri: mongoUri.replace(/\/\/[^@]+@/, '//***@') }, 'MongoDB connected');

  // ─── Redis ────────────────────────────────────────────────────────────────
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
    await redisClient.connect();
    // Expose to the request pipeline (used by the /health readiness probe)
    app.locals['redis'] = redisClient;
    logger.info('Redis connected');
  }

  // ─── Cron jobs ────────────────────────────────────────────────────────────
  if (process.env.SINGLE_DAILY_INSIGHT_JOB === 'true') {
    scheduleDailyInsightJob();
    logger.info('Daily insight cron job scheduled');
  }

  // ─── HTTP server ──────────────────────────────────────────────────────────
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, `API server listening`);
  });

  setupGracefulShutdown(server);
}

/**
 * Drain in-flight requests and close DB/Redis connections on SIGTERM/SIGINT
 * (sent by `docker stop` and orchestrators on redeploy). Falls back to a
 * forced exit if shutdown stalls past the timeout.
 */
function setupGracefulShutdown(server: Server): void {
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown started');

    const forceExit = setTimeout(() => {
      logger.error('Shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close(async () => {
      try {
        await mongoose.disconnect();
        if (redisClient) await redisClient.quit();
        logger.info('Cleanup complete, exiting');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
