import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Tenant } from '../../models/tenant.model';
import { NotFoundError } from '../../utils/errors';

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug 只能包含小写字母、数字和连字符'),
  type: z.enum(['tenant', 'partner']),
  plan: z.enum(['trial', 'basic', 'pro']).default('trial'),
  limits: z.object({
    maxUsers: z.number().int().positive().optional(),
    aiCallsPerDay: z.number().int().positive().optional(),
  }).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['trial', 'active', 'suspended']).optional(),
  plan: z.enum(['trial', 'basic', 'pro']).optional(),
  limits: z.object({
    maxUsers: z.number().int().positive().optional(),
    aiCallsPerDay: z.number().int().positive().optional(),
  }).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  themeConfig: z.record(z.unknown()).optional(),
  aiConfig: z.object({
    provider: z.enum(['mock', 'coze']).optional(),
    botId: z.string().optional(),
  }).optional(),
});

export async function createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSchema.parse(req.body);
    const account = await Tenant.create({
      ...body,
      status: 'active',
      themeConfig: {},
      aiConfig: { provider: 'mock' },
      limits: body.limits ?? { maxUsers: 100 },
      ipWhitelist: [],
    });
    res.status(201).json({ success: true, data: account, error: null, code: null });
  } catch (err) { next(err); }
}

export async function listAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const filter = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { slug: { $regex: search, $options: 'i' } }] }
      : {};
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));
    const [accounts, total] = await Promise.all([
      Tenant.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      Tenant.countDocuments(filter),
    ]);
    res.json({ success: true, data: { accounts, meta: { total, page: p, limit: l } }, error: null, code: null });
  } catch (err) { next(err); }
}

export async function getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const account = await Tenant.findById(req.params.id).lean();
    if (!account) throw new NotFoundError('Account');
    res.json({ success: true, data: account, error: null, code: null });
  } catch (err) { next(err); }
}

export async function updateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateSchema.parse(req.body);
    const account = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true },
    ).lean();
    if (!account) throw new NotFoundError('Account');
    res.json({ success: true, data: account, error: null, code: null });
  } catch (err) { next(err); }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const account = await Tenant.findByIdAndDelete(req.params.id).lean();
    if (!account) throw new NotFoundError('Account');
    res.json({ success: true, data: null, error: null, code: null });
  } catch (err) { next(err); }
}
