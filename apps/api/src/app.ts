import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { logger } from './utils/logger';
import { errorMiddleware } from './middlewares/error.middleware';
import { resolveTenant } from './middlewares/tenant.middleware';
import router from './routes/index';

const app = express();

// ─── Security ──────────────────────────────────────────────────────────────
app.use(helmet());

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  }),
);

// ─── Request parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── HTTP request logging ───────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    customLogLevel(_req, res) {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);

// ─── Global rate limiting ───────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000), // 15 min
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: '请求过于频繁，请稍后再试' },
  }),
);

// ─── Routes ─────────────────────────────────────────────────────────────────
// Mount router once; skip tenant resolution for public config endpoints
app.use(
  '/api/v1',
  (req, res, next) => {
    // /tenants/public/* is bootstrap — no tenant context needed
    if (req.path.startsWith('/tenants/public/')) return next();
    return resolveTenant(req, res, next);
  },
  router,
);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, error: '接口不存在' });
});

// ─── Error handling ──────────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
