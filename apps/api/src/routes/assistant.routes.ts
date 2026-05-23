import { Router } from 'express';
import { assistantController } from '../controllers/assistant.controller';
import { requireAuthOrGuest } from '../middlewares/auth.middleware';

const router = Router();

// Allow both registered users and guests to chat with the assistant
router.post('/chat', requireAuthOrGuest, assistantController.chat);

export default router;
