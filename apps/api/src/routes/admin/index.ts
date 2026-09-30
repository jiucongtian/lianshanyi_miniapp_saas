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
import * as billingCtrl from '../../controllers/admin/billing.controller';
import * as periodCtrl from '../../controllers/admin/billing-period.controller';

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
router.post('/accounts', accountsCtrl.createAccount);
router.get('/accounts/:id', accountsCtrl.getAccount);
router.patch('/accounts/:id', accountsCtrl.updateAccount);
router.delete('/accounts/:id', accountsCtrl.deleteAccount);

// Users
router.get('/users', usersCtrl.listUsers);
router.post('/users', usersCtrl.createUser);
router.delete('/users/:userId', usersCtrl.deleteUser);
router.patch('/users/:userId/type', usersCtrl.updateUserType);

// Feedbacks
router.get('/feedbacks', feedbacksCtrl.listFeedbacks);
router.post('/feedbacks/:tenantId/:feedbackId/review', feedbacksCtrl.markFeedbackReviewed);

// Logs & dashboard
router.get('/logs', logsCtrl.listLogs);
router.get('/dashboard/usage', logsCtrl.getUsageStats);
router.get('/dashboard/overview', logsCtrl.getOverview);

// AI billing: prices are explicit, entries retain the price at generation time.
router.get('/billing/rates', billingCtrl.listRates);
router.put('/billing/rates/:product', billingCtrl.setRate);
router.get('/billing/entries', billingCtrl.listEntries);
router.get('/billing/summary', billingCtrl.getSummary);
router.get('/billing/statement', billingCtrl.getStatement);
router.get('/billing/periods/current', periodCtrl.current);
router.get('/billing/periods', periodCtrl.listPeriods);
router.delete('/billing/periods/:id', periodCtrl.remove);
router.post('/billing/periods/preview', periodCtrl.preview);
router.post('/billing/periods/generate', periodCtrl.generate);
router.get('/billing/periods/:id/entries', periodCtrl.entries);
router.get('/billing/periods/:id/summary', periodCtrl.summary);
router.get('/billing/periods/:id/statement', periodCtrl.statement);

export default router;
