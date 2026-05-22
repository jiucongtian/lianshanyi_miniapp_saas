import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import {
  requireAuth,
  requireUser,
  requireAdmin,
} from '../middlewares/auth.middleware';

const router = Router();

// Public / auth-only
router.get('/types', userController.getAllUserTypes);

// Requires valid JWT (including guest for read)
router.get('/me', requireAuth, userController.getMe);

// Requires non-guest user
router.patch('/me', requireUser, userController.updateMe);
router.post('/me/password', requireUser, userController.setPassword);

// Admin only
router.get('/', requireAdmin, userController.listUsers);
router.patch('/:userId/type', requireAdmin, userController.updateUserType);

export default router;
