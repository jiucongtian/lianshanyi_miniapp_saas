import { Router } from 'express';
import { cardController } from '../controllers/card.controller';
import { optionalAuth, requireUser } from '../middlewares/auth.middleware';

const router = Router();

// Public / optional auth routes
router.get('/', optionalAuth, cardController.listCards);
router.get('/history', requireUser, cardController.getDrawHistory);
router.post('/draw', requireUser, cardController.drawCard);
router.post('/interpret', requireUser, cardController.interpretCard);

// Note: /:cardId must come after named routes to avoid conflicts
router.get('/:cardId', optionalAuth, cardController.getCard);

export default router;
