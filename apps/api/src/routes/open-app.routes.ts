import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.middleware';
import { requireScope } from '../middlewares/scope.middleware';
import { ADMIN_SCOPES } from '../lib/openapi/scopes';
import * as ctrl from '../controllers/open-app.controller';

const router = Router();

const adminAuth = [authenticate('jwt', 'hmac'), requireScope(ADMIN_SCOPES.OPEN_APP_MANAGE)];

router.get('/', ...adminAuth, ctrl.listApps);
router.post('/', ...adminAuth, ctrl.createApp);
router.get('/:appId', ...adminAuth, ctrl.getApp);
router.post('/:appId/rotate-secret', ...adminAuth, ctrl.rotateSecret);
router.patch('/:appId/status', ...adminAuth, ctrl.setStatus);
router.patch('/:appId/scopes', ...adminAuth, ctrl.updateScopes);

export default router;
