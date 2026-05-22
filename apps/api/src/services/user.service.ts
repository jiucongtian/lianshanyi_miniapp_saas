import bcrypt from 'bcryptjs';
import { User, IUser, UserType } from '../models/user.model';
import { StaticUserType } from '../models/static-user-type.model';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('UserService');

export const userService = {
  async getById(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('用户');
    return user;
  },

  async updateProfile(
    userId: string,
    data: { nickname?: string; avatarUrl?: string },
  ): Promise<IUser> {
    const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
    if (!user) throw new NotFoundError('用户');
    return user;
  },

  async setPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new NotFoundError('用户');

    if (user.passwordHash) {
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw new ForbiddenError('当前密码错误');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
  },

  async bindPhone(userId: string, phone: string): Promise<IUser> {
    const existing = await User.findOne({ phone, _id: { $ne: userId } });
    if (existing) throw new ConflictError('该手机号已被其他账号绑定');
    const user = await User.findByIdAndUpdate(userId, { phone }, { new: true });
    if (!user) throw new NotFoundError('用户');
    return user;
  },

  async getUserTypeConfig(typeKey: string) {
    const config = await StaticUserType.findOne({ typeKey });
    return config;
  },

  async getAllUserTypes() {
    return StaticUserType.find().sort({ sortOrder: 1 });
  },

  // Admin operations
  async listUsers(page: number, limit: number, search?: string) {
    const query = search
      ? { $or: [{ phone: { $regex: search } }, { username: { $regex: search } }] }
      : {};
    const [users, total] = await Promise.all([
      User.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);
    return { users, total };
  },

  async updateUserType(userId: string, userType: UserType, isAdmin?: boolean): Promise<IUser> {
    const update: Partial<IUser> = { userType };
    if (typeof isAdmin === 'boolean') update.isAdmin = isAdmin;
    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) throw new NotFoundError('用户');
    return user;
  },
};
