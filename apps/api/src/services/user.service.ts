import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, IUser, UserType } from '../models/user.model';
import { StaticUserType } from '../models/static-user-type.model';
import { UserRepo } from '../repos';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('UserService');

export const userService = {
  // getById / updateProfile / setPassword operate on a single user by ID
  // from the JWT — no tenant scope needed here.

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

    const newHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(userId, { passwordHash: newHash });
  },

  async bindPhone(userId: string, tenantId: string, phone: string): Promise<IUser> {
    const repo = new UserRepo(tenantId);
    const existing = await repo.findOne({
      phone,
      _id: { $ne: new mongoose.Types.ObjectId(userId) },
    });
    if (existing) throw new ConflictError('该手机号已被其他账号绑定');
    const user = await User.findByIdAndUpdate(userId, { phone }, { new: true });
    if (!user) throw new NotFoundError('用户');
    return user;
  },

  async getUserTypeConfig(typeKey: string) {
    return StaticUserType.findOne({ typeKey });
  },

  async getAllUserTypes() {
    return StaticUserType.find().sort({ sortOrder: 1 });
  },

  async listUsers(tenantId: string, page: number, limit: number, search?: string) {
    const repo = new UserRepo(tenantId);
    const filter = search
      ? { $or: [{ phone: { $regex: search } }, { username: { $regex: search } }] }
      : {};
    const [users, total] = await Promise.all([
      repo.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      repo.countDocuments(filter),
    ]);
    return { users, total };
  },

  async updateUserType(
    userId: string,
    tenantId: string,
    userType: UserType,
    isAdmin?: boolean,
  ): Promise<IUser> {
    const repo = new UserRepo(tenantId);
    const update: Partial<IUser> = { userType };
    if (typeof isAdmin === 'boolean') update.isAdmin = isAdmin;
    const user = await repo.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      update,
      { new: true },
    );
    if (!user) throw new NotFoundError('用户');
    log.info({ tenantId, userId, userType }, 'User type updated');
    return user;
  },
};
