import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { requireUser } from '../middlewares/auth.middleware';

const router = Router();

// All profile routes require a logged-in (non-guest) user
router.use(requireUser);

router.get('/', profileController.listProfiles);
router.post('/', profileController.createProfile);
router.get('/:id', profileController.getProfile);
router.patch('/:id', profileController.updateProfile);
router.delete('/:id', profileController.deleteProfile);
router.post('/:id/default', profileController.setDefault);

export default router;
