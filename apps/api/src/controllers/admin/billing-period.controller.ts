import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { BILLING_PRODUCTS } from '../../models/billing-rate.model';
import { billingPeriodService } from '../../services/billing-period.service';
import { AppError } from '../../utils/errors';

const rangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
}).refine(({ from, to }) => new Date(to).getTime() > new Date(from).getTime(), '结束时间必须晚于开始时间')
  .refine(({ from, to }) => new Date(to).getTime() - new Date(from).getTime() <= 366 * 86400_000, '时间范围最多 366 天');

const pricesSchema = z.object({
  'card-insight': z.number().int().min(0).max(100_000_000),
  'daily-insight': z.number().int().min(0).max(100_000_000),
  'tutor-chat': z.number().int().min(0).max(100_000_000),
}).strict();

const previewSchema = rangeSchema.and(z.object({ pricesFen: pricesSchema }));
const generateSchema = rangeSchema.and(z.object({
  pricesFen: pricesSchema,
  expectedFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}));
const lineQuerySchema = z.object({
  appId: z.string().trim().min(1).max(80).optional(),
  accountId: z.string().trim().min(1).max(80).optional(),
  product: z.enum(BILLING_PRODUCTS).optional(),
  revision: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError(result.error.errors[0].message, 400, 'VALIDATION_ERROR');
  return result.data;
}

function periodId(req: Request): mongoose.Types.ObjectId {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('账期 ID 无效', 400, 'VALIDATION_ERROR');
  return new mongoose.Types.ObjectId(req.params.id);
}

function send(res: Response, data: unknown): void {
  res.json({ success: true, data, error: null, code: null });
}

export async function current(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to } = parse(rangeSchema, req.query);
    send(res, await billingPeriodService.findByRange(new Date(from), new Date(to)));
  } catch (error) { next(error); }
}

export async function listPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = parse(lineQuerySchema, req.query);
    const result = await billingPeriodService.listPeriods(page, limit);
    send(res, { items: result.items, meta: { total: result.total, page, limit } });
  } catch (error) { next(error); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { revision } = parse(z.object({ revision: z.coerce.number().int().min(1) }), req.query);
    send(res, await billingPeriodService.remove(periodId(req), revision, req.principal!.subjectUserId!));
  } catch (error) { next(error); }
}

export async function preview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to, pricesFen } = parse(previewSchema, req.body);
    send(res, await billingPeriodService.preview(new Date(from), new Date(to), pricesFen));
  } catch (error) { next(error); }
}

export async function generate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to, pricesFen, expectedFingerprint } = parse(generateSchema, req.body);
    send(res, await billingPeriodService.generate(new Date(from), new Date(to), pricesFen, expectedFingerprint, req.principal!.subjectUserId!));
  } catch (error) { next(error); }
}

export async function entries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { revision, page, limit, ...filter } = parse(lineQuerySchema, req.query);
    const result = await billingPeriodService.list(periodId(req), revision, filter, page, limit);
    send(res, { items: result.items, meta: { total: result.total, page, limit } });
  } catch (error) { next(error); }
}

export async function summary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { revision, appId, accountId, product } = parse(lineQuerySchema, req.query);
    send(res, await billingPeriodService.summary(periodId(req), revision, { appId, accountId, product }));
  } catch (error) { next(error); }
}

export async function statement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { revision, appId, accountId, product } = parse(lineQuerySchema, req.query);
    const id = periodId(req);
    const filter = { appId, accountId, product };
    const firstPage = await billingPeriodService.list(id, revision, filter, 1, 1);
    if (firstPage.total > 5000) throw new AppError('对账记录超过 5000 条，请缩小范围后导出', 400, 'EXPORT_LIMIT');
    const [items, totals] = await Promise.all([
      billingPeriodService.list(id, revision, filter, 1, Math.max(1, firstPage.total)),
      billingPeriodService.summary(id, revision, filter),
    ]);
    send(res, { summary: totals, items: items.items, total: firstPage.total });
  } catch (error) { next(error); }
}
