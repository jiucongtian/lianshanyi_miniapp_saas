import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('AuthController');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export const authController = {
  async sendCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body as { phone?: unknown };
      if (!phone || typeof phone !== 'string') {
        throw new ValidationError('手机号不能为空');
      }
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        throw new ValidationError('手机号格式不正确');
      }
      await authService.sendSmsCode(phone);
      sendSuccess(res, { message: '验证码已发送' });
    } catch (err) {
      next(err);
    }
  },

  async loginSms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, code } = req.body as { phone?: unknown; code?: unknown };
      if (!phone || typeof phone !== 'string') throw new ValidationError('手机号不能为空');
      if (!code || typeof code !== 'string') throw new ValidationError('验证码不能为空');

      const { accessToken, refreshToken, user } = await authService.loginWithSms(phone, code);
      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      sendSuccess(res, { accessToken, user });
    } catch (err) {
      next(err);
    }
  },

  async loginPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body as { username?: unknown; password?: unknown };
      if (!username || typeof username !== 'string') throw new ValidationError('用户名不能为空');
      if (!password || typeof password !== 'string') throw new ValidationError('密码不能为空');

      const { accessToken, refreshToken, user } = await authService.loginWithPassword(
        username,
        password,
      );
      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      sendSuccess(res, { accessToken, user });
    } catch (err) {
      next(err);
    }
  },

  async guestLogin(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessToken, userId } = await authService.issueGuestToken();
      sendSuccess(res, { accessToken, userId });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.refreshToken as string | undefined;
      if (!token) {
        throw new Error('refreshToken cookie missing');
      }
      const { accessToken, user } = await authService.refreshAccessToken(token);
      sendSuccess(res, { accessToken, user });
    } catch (err) {
      next(err);
    }
  },

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie('refreshToken', { path: '/' });
      sendSuccess(res, { message: '已退出登录' });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, phone } = req.body as {
        username?: unknown;
        password?: unknown;
        phone?: unknown;
      };
      if (!username || typeof username !== 'string') throw new ValidationError('用户名不能为空');
      if (!password || typeof password !== 'string') throw new ValidationError('密码不能为空');
      if (password.length < 6) throw new ValidationError('密码长度不能少于6位');

      const { accessToken, refreshToken, user } = await authService.registerWithPassword(
        username,
        password,
        phone && typeof phone === 'string' ? phone : undefined,
      );
      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
      sendSuccess(res, { accessToken, user }, 201);
    } catch (err) {
      next(err);
    }
  },
};
