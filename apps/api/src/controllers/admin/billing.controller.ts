import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { billingService } from '../../services/billing.service';
import { BILLING_PRODUCTS } from '../../models/billing-rate.model';
import type { BillingFilter } from '../../repos/billing.repo';
import { AppError } from '../../utils/errors';

const filterSchema = z.object({
  appId: z.string().trim().min(1).max(80).optional(),
  accountId: z.string().trim().min(1).max(80).optional(),
  product: z.enum(BILLING_PRODUCTS).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).refine((v) => !v.from || !v.to || v.from < v.to, {
  message: '结束时间必须晚于开始时间',
});

function parseFilter(query: Request['query']): { filter: BillingFilter; page: number; limit: number } {
  const parsed = filterSchema.safeParse(query);
  if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR');
  const { appId, accountId, product, from, to, page, limit } = parsed.data;
  return {
    filter: {
      appId, accountId, product,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    },
    page, limit,
  };
}

export async function listRates(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rates = await billingService.listRates();
    res.json({ success: true, data: rates, error: null, code: null });
  } catch (err) { next(err); }
}

export async function setRate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = z.enum(BILLING_PRODUCTS).safeParse(req.params.product);
    const body = z.object({ priceFen: z.number().int().min(0).max(100_000_000) }).safeParse(req.body);
    if (!product.success || !body.success) throw new AppError('接口或单价格式无效', 400, 'VALIDATION_ERROR');
    const rate = await billingService.setRate(product.data, body.data.priceFen);
    res.json({ success: true, data: rate, error: null, code: null });
  } catch (err) { next(err); }
}

export async function listEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filter, page, limit } = parseFilter(req.query);
    const { items, total } = await billingService.list(filter, page, limit);
    res.json({ success: true, data: { items, meta: { total, page, limit } }, error: null, code: null });
  } catch (err) { next(err); }
}

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filter } = parseFilter(req.query);
    const summary = await billingService.summary(filter);
    res.json({ success: true, data: summary, error: null, code: null });
  } catch (err) { next(err); }
}

export async function getStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { filter } = parseFilter(req.query);
    const [summary, firstPage] = await Promise.all([
      billingService.summary(filter),
      billingService.list(filter, 1, 1),
    ]);
    if (firstPage.total > 5000) {
      throw new AppError('对账记录超过 5000 条，请缩小日期或 App ID 范围后导出', 400, 'EXPORT_LIMIT');
    }
    const { items } = await billingService.list(filter, 1, Math.max(1, firstPage.total));
    res.json({ success: true, data: { summary, items, total: firstPage.total }, error: null, code: null });
  } catch (err) { next(err); }
}
