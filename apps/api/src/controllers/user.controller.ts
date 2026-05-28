import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { paginationMeta } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';
import { UserType } from '../models/user.model';

const log = createModuleLogger('UserController');

export const userController = {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getById(req.user!.userId);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nickname, avatarUrl } = req.body as { nickname?: unknown; avatarUrl?: unknown };
      const data: { nickname?: string; avatarUrl?: string } = {};
      if (nickname !== undefined) {
        if (typeof nickname !== 'string') throw new ValidationError('昵称格式不正确');
        data.nickname = nickname;
      }
      if (avatarUrl !== undefined) {
        if (typeof avatarUrl !== 'string') throw new ValidationError('头像URL格式不正确');
        data.avatarUrl = avatarUrl;
      }
      const user = await userService.updateProfile(req.user!.userId, data);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },

  async setPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: unknown;
        newPassword?: unknown;
      };
      if (typeof currentPassword !== 'string') throw new ValidationError('当前密码不能为空');
      if (typeof newPassword !== 'string') throw new ValidationError('新密码不能为空');
      if (newPassword.length < 6) throw new ValidationError('新密码长度不能少于6位');

      await userService.setPassword(req.user!.userId, currentPassword, newPassword);
      sendSuccess(res, { message: '密码修改成功' });
    } catch (err) {
      next(err);
    }
  },

  async getAllUserTypes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const types = await userService.getAllUserTypes();
      sendSuccess(res, types);
    } catch (err) {
      next(err);
    }
  },

  // Admin handlers — scoped to current tenant
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));
      const search = req.query['search'] ? String(req.query['search']) : undefined;

      const { users, total } = await userService.listUsers(req.user!.tenantId, page, limit, search);
      sendSuccess(res, users, 200, paginationMeta(total, page, limit));
    } catch (err) {
      next(err);
    }
  },

  async updateUserType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { userType, isAdmin } = req.body as { userType?: unknown; isAdmin?: unknown };

      const validTypes: UserType[] = ['guest', 'normal', 'student', 'premium'];
      if (!userType || !validTypes.includes(userType as UserType)) {
        throw new ValidationError('userType 必须为 guest, normal, student 或 premium');
      }

      const user = await userService.updateUserType(
        userId!,
        req.user!.tenantId,
        userType as UserType,
        typeof isAdmin === 'boolean' ? isAdmin : undefined,
      );
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  },
};
