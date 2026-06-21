import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAiAdapter } from '../../lib/ai/adapter';
import { Tenant } from '../../models/tenant.model';
import { sendOk, sendErr, ERROR_CODES } from '../../lib/openapi/response';
import { logger } from '../../utils/logger';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date 格式须为 YYYY-MM-DD'),
  cardName: z.string().min(1).max(10),
});

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      sendErr(res, 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.errors[0].message);
      return;
    }

    const principal = req.principal!;
    const account = await Tenant.findById(principal.contextId).lean();
    if (!account) {
      sendErr(res, 403, ERROR_CODES.FORBIDDEN_SCOPE, '凭据未绑定有效账户');
      return;
    }

    const adapter = await getAiAdapter();
    try {
      const result = await adapter.generateDailyInsight(parsed.data);
      sendOk(res, {
        title: result.title,
        summary: result.summary,
        fullText: result.fullText,
        luckyDirection: result.luckyDirection,
        luckyColor: result.luckyColor,
        luckyNumber: result.luckyNumber,
      });
    } catch (err: unknown) {
      logger.error({ err, appId: req.headers['x-app-id'] }, 'AI upstream error (daily-insight)');
      sendErr(res, 500, ERROR_CODES.AI_UPSTREAM_ERROR, 'AI 服务暂时不可用，请稍后重试');
      return;
    }
  } catch (err) {
    next(err);
  }
}
