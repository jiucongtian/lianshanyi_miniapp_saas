import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, UserType } from '../../models/user.model';
import { NotFoundError } from '../../utils/errors';

const createUserSchema = z.object({
  tenantId: z.string().min(1),
  username: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(6),
  userType: z.enum(['guest', 'normal', 'student', 'premium']).default('normal'),
});

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, page = '1', limit = '20', tenantId, userType } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));

    const filter: Record<string, unknown> = {};
    if (tenantId) filter.tenantId = new mongoose.Types.ObjectId(tenantId);
    if (userType) filter.userType = userType;
    if (search) filter.$or = [{ phone: { $regex: search, $options: 'i' } }, { username: { $regex: search, $options: 'i' } }, { nickname: { $regex: search, $options: 'i' } }];

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('tenantId', 'name slug')
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: { users, meta: { total, page: p, limit: l } }, error: null, code: null });
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      tenantId: new mongoose.Types.ObjectId(body.tenantId),
      username: body.username,
      phone: body.phone,
      userType: body.userType,
      isGuest: false,
      passwordHash,
    });
    const populated = await user.populate('tenantId', 'name slug');
    res.status(201).json({ success: true, data: populated.toJSON(), error: null, code: null });
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findByIdAndDelete(req.params.userId).lean();
    if (!user) throw new NotFoundError('User');
    res.json({ success: true, data: null, error: null, code: null });
  } catch (err) { next(err); }
}

export async function updateUserType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userType } = z.object({ userType: z.enum(['guest', 'normal', 'student', 'premium']) }).parse(req.body);
    const user = await User.findById(req.params.userId);
    if (!user) throw new NotFoundError('User');
    user.userType = userType as UserType;
    await user.save();
    res.json({ success: true, data: user.toJSON(), error: null, code: null });
  } catch (err) { next(err); }
}
