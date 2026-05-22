import { Router } from 'express';
import { assistantController } from '../controllers/assistant.controller';
import { requireUser } from '../middlewares/auth.middleware';

const router = Router();

router.post('/chat', requireUser, assistantController.chat);

export default router;
