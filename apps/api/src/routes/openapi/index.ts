import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware';
import { requireScope } from '../../middlewares/scope.middleware';
import { PLATFORM_SCOPES } from '../../lib/openapi/scopes';
import * as baziCtrl from '../../controllers/openapi/bazi.controller';
import * as aiCtrl from '../../controllers/openapi/ai.controller';

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
  '/ai/chat',
  authenticate('hmac'),
  requireScope(PLATFORM_SCOPES.AI_CHAT),
  aiCtrl.chat,
);

export default router;
