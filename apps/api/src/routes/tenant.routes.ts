import { Router } from 'express';
import { tenantController } from '../controllers/tenant.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Public — no auth, no tenant resolution required
router.get('/public/:slug/config', tenantController.getPublicConfig);

// Super admin operations
router.get('/', requireAdmin, tenantController.listTenants);
router.post('/', requireAdmin, tenantController.createTenant);
router.patch('/:slug/theme', requireAdmin, tenantController.updateTheme);

export default router;
