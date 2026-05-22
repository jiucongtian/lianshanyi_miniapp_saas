import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User, IUser } from '../models/user.model';
import {
  signAccessToken,
  signRefreshToken,
  signGuestToken,
  verifyRefreshToken,
} from '../lib/crypto/jwt';
import { getSmsAdapter } from '../lib/sms/adapter';
import {
  AppError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('AuthService');

function generateSmsCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildTokenPayload(user: IUser) {
  return {
    userId: user._id.toString(),
    userType: user.userType,
    isAdmin: user.isAdmin,
    isGuest: user.isGuest,
  };
}

export const authService = {
  /**
   * Send SMS verification code (creates user if first time)
   */
  async sendSmsCode(phone: string): Promise<void> {
    const code = generateSmsCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await User.findOneAndUpdate(
      { phone },
      { smsCode: code, smsCodeExpiry: expiry },
      { upsert: true, new: true },
    );

    const sms = await getSmsAdapter();
    await sms.sendVerificationCode(phone, code);
    log.info({ phone }, 'SMS code sent');
  },

  /**
   * Login/register with phone + SMS code
   */
  async loginWithSms(
    phone: string,
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: IUser; isNew: boolean }> {
    const user = await User.findOne({ phone });
    if (!user || !user.smsCode || !user.smsCodeExpiry) {
      throw new UnauthorizedError('验证码无效，请重新获取');
    }
    if (user.smsCode !== code) {
      throw new UnauthorizedError('验证码错误');
    }
    if (user.smsCodeExpiry < new Date()) {
      throw new UnauthorizedError('验证码已过期，请重新获取');
    }

    const isNew = !user.lastLoginAt;
    user.smsCode = undefined;
    user.smsCodeExpiry = undefined;
    user.lastLoginAt = new Date();
    if (isNew) {
      user.userType = 'normal';
      user.isGuest = false;
    }
    await user.save();

    const accessToken = signAccessToken(buildTokenPayload(user));
    const refreshToken = signRefreshToken(user._id.toString());
    return { accessToken, refreshToken, user, isNew };
  },

  /**
   * Login with username + password
   */
  async loginWithPassword(
    usernameOrPhone: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    const user = await User.findOne({
      $or: [{ username: usernameOrPhone }, { phone: usernameOrPhone }],
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = signAccessToken(buildTokenPayload(user));
    const refreshToken = signRefreshToken(user._id.toString());
    return { accessToken, refreshToken, user };
  },

  /**
   * Issue a guest JWT (no DB user required for read-only browsing)
   */
  async issueGuestToken(): Promise<{ accessToken: string; userId: string }> {
    const guestToken = randomUUID();
    const user = await User.create({
      isGuest: true,
      guestToken,
      userType: 'guest',
    });

    const payload = buildTokenPayload(user);
    const accessToken = signGuestToken(payload);
    return { accessToken, userId: user._id.toString() };
  },

  /**
   * Refresh access token using refresh token (stored in httpOnly cookie)
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; user: IUser }> {
    const { userId } = verifyRefreshToken(refreshToken);
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }

    const accessToken = signAccessToken(buildTokenPayload(user));
    return { accessToken, user };
  },

  /**
   * Register username + password (for admin creation or alternative login)
   */
  async registerWithPassword(
    username: string,
    password: string,
    phone?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    const existing = await User.findOne({ $or: [{ username }, ...(phone ? [{ phone }] : [])] });
    if (existing) {
      throw new ConflictError('用户名或手机号已存在');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      phone,
      passwordHash,
      userType: 'normal',
      isGuest: false,
    });

    const accessToken = signAccessToken(buildTokenPayload(user));
    const refreshToken = signRefreshToken(user._id.toString());
    return { accessToken, refreshToken, user };
  },
};
