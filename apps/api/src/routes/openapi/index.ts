import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware';
import { requireScope } from '../../middlewares/scope.middleware';
import { PLATFORM_SCOPES } from '../../lib/openapi/scopes';
import * as baziCtrl from '../../controllers/openapi/bazi.controller';
import * as tutorCtrl from '../../controllers/openapi/tutor-chat.controller';
import * as cardInsightCtrl from '../../controllers/openapi/card-insight.controller';
import * as dailyInsightCtrl from '../../controllers/openapi/daily-insight.controller';

const router = Router();

router.get('/ping', (_req, res) => {
  res.json({ success: true, data: { pong: true }, error: null, code: null });
});

router.post(
  '/bazi/calculate',
  authenticate('hmac'),
  requireScope(PLATFORM_SCOPES.BAZI_CALCULATE),
  baziCtrl.calculate,
);

router.post(
  '/tutor-chat',
  authenticate('hmac'),
  requireScope(PLATFORM_SCOPES.TUTOR_CHAT),
  tutorCtrl.chat,
);

router.post(
  '/card-insight',
  authenticate('hmac'),
  requireScope(PLATFORM_SCOPES.INSIGHT_INTERPRET),
  cardInsightCtrl.interpret,
);

router.get(
  '/daily-insight',
  authenticate('hmac'),
  requireScope(PLATFORM_SCOPES.DAILY_INSIGHT_READ),
  dailyInsightCtrl.get,
);

export default router;
