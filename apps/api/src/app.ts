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
import { auditMiddleware } from './middlewares/audit.middleware';
import router from './routes/index';
import openapiRouter from './routes/openapi/index';

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
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Slug',
      'X-App-Id',
      'X-Timestamp',
      'X-Nonce',
      'X-Signature',
    ],
  }),
);

// ─── Request parsing ────────────────────────────────────────────────────────
// Capture raw body buffer for HMAC signature verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req: express.Request, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
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
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, data: null, error: '请求过于频繁，请稍后再试', code: 'RATE_LIMITED' },
  }),
);

// ─── /openapi/v1 — external facade (HMAC-signed requests only) ──────────────
app.use('/openapi/v1', auditMiddleware, openapiRouter);

// ─── /api/v1 — internal facade (JWT + optional HMAC for tenant backends) ────
app.use(
  '/api/v1',
  (req, res, next) => {
    if (req.path.startsWith('/tenants/public/')) return next();
    return resolveTenant(req, res, next);
  },
  router,
);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, error: '接口不存在', code: 'NOT_FOUND' });
});

// ─── Error handling ──────────────────────────────────────────────────────────
app.use(errorMiddleware);

export default app;
