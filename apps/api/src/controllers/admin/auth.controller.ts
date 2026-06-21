import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { userService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { UnauthorizedError } from '../../utils/errors';
import { signAccessToken, signRefreshToken } from '../../lib/crypto/jwt';

const loginSchema = z.object({
  usernameOrPhone: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '旧密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6位'),
});

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);

    // We need any tenant to resolve the user; admin users exist on platform tenant.
    // Find the user globally (cross-tenant lookup by username/phone).
    const user = await User.findOne({
      $or: [{ username: body.usernameOrPhone }, { phone: body.usernameOrPhone }],
      isAdmin: true,
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('用户名或密码错误');

    // Sign tokens directly — avoids redundant DB round-trip in authService
    const accessToken = signAccessToken({
      userId: user._id.toString(),
      tenantId: user.tenantId?.toString() ?? '',
      userType: user.userType,
      isAdmin: user.isAdmin,
      isGuest: user.isGuest ?? false,
    });
    const refreshToken = signRefreshToken(user._id.toString());

    // Update last login time (fire-and-forget, do not block response)
    User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec().catch(() => undefined);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          username: user.username,
          phone: user.phone,
          isAdmin: user.isAdmin,
        },
      },
      error: null,
      code: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = changePasswordSchema.parse(req.body);
    const userId = req.principal!.subjectUserId!;
    await userService.setPassword(userId, body.oldPassword, body.newPassword);
    res.json({ success: true, data: null, error: null, code: null });
  } catch (err) {
    next(err);
  }
}
