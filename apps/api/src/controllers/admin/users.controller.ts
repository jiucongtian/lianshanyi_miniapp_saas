import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '../../services/user.service';
import { User, UserType } from '../../models/user.model';

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, page = '1', limit = '20', tenantId } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));

    if (tenantId) {
      const { users, total } = await userService.listUsers(tenantId, p, l, search);
      res.json({ success: true, data: { users, meta: { total, page: p, limit: l } }, error: null, code: null });
      return;
    }

    // Cross-tenant listing for super admin
    const filter = search
      ? { $or: [{ phone: { $regex: search } }, { username: { $regex: search } }] }
      : {};
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: { users, meta: { total, page: p, limit: l } }, error: null, code: null });
  } catch (err) { next(err); }
}

export async function updateUserType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userType } = z.object({ userType: z.enum(['guest', 'normal', 'student', 'premium']) }).parse(req.body);
    const user = await User.findById(req.params.userId);
    if (!user) { res.status(404).json({ success: false, data: null, error: '用户不存在', code: 'NOT_FOUND' }); return; }
    user.userType = userType as UserType;
    await user.save();
    res.json({ success: true, data: user.toJSON(), error: null, code: null });
  } catch (err) { next(err); }
}
