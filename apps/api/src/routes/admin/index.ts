import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware';
import { requireAdmin } from '../../middlewares/require-admin.middleware';
import * as authCtrl from '../../controllers/admin/auth.controller';
import * as aiConfigCtrl from '../../controllers/admin/ai-config.controller';
import * as credCtrl from '../../controllers/admin/credentials.controller';
import * as accountsCtrl from '../../controllers/admin/accounts.controller';
import * as usersCtrl from '../../controllers/admin/users.controller';
import * as feedbacksCtrl from '../../controllers/admin/feedbacks.controller';
import * as logsCtrl from '../../controllers/admin/logs.controller';

const router = Router();

// Public: admin login (no auth required)
router.post('/auth/login', authCtrl.adminLogin);

// All routes below require admin JWT
router.use(authenticate('jwt'), requireAdmin);

// Change password
router.put('/auth/password', authCtrl.changePassword);

// AI config
router.get('/ai-config', aiConfigCtrl.getAiConfig);
router.put('/ai-config', aiConfigCtrl.updateAiConfig);
router.post('/ai-config/test', aiConfigCtrl.testAiConnection);

// Credentials (replaces /open-apps)
router.get('/credentials', credCtrl.listCredentials);
router.post('/credentials', credCtrl.createCredential);
router.get('/credentials/:appId', credCtrl.getCredential);
router.get('/credentials/:appId/secret', credCtrl.revealSecret);
router.patch('/credentials/:appId', credCtrl.updateCredential);
router.post('/credentials/:appId/rotate-secret', credCtrl.rotateSecret);
router.patch('/credentials/:appId/status', credCtrl.setStatus);

// Accounts
router.get('/accounts', accountsCtrl.listAccounts);
router.get('/accounts/:id', accountsCtrl.getAccount);
router.patch('/accounts/:id', accountsCtrl.updateAccount);

// Users
router.get('/users', usersCtrl.listUsers);
router.patch('/users/:userId/type', usersCtrl.updateUserType);

// Feedbacks
router.get('/feedbacks', feedbacksCtrl.listFeedbacks);
router.post('/feedbacks/:tenantId/:feedbackId/review', feedbacksCtrl.markFeedbackReviewed);

// Logs & dashboard
router.get('/logs', logsCtrl.listLogs);
router.get('/dashboard/usage', logsCtrl.getUsageStats);
router.get('/dashboard/overview', logsCtrl.getOverview);

export default router;
