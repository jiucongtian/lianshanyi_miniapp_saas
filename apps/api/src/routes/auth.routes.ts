import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Strict rate limit for SMS code endpoint: 5 requests per 15 min per IP
const smsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.SMS_RATE_LIMIT_MAX ?? 5),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { success: false, data: null, error: '发送验证码过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send-code', smsRateLimit, authController.sendCode);
router.post('/login/sms', authController.loginSms);
router.post('/login/password', authController.loginPassword);
router.post('/login/guest', authController.guestLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/register', authController.register);

export default router;
