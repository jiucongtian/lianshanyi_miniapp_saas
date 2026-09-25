import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAiAdapter } from '../../lib/ai/adapter';
import { Tenant } from '../../models/tenant.model';
import { sendOk, sendErr, ERROR_CODES } from '../../lib/openapi/response';
import { logger } from '../../utils/logger';
import { billingService } from '../../services/billing.service';

const interpretSchema = z.object({
  cardName: z.string().min(1).max(10),
  question: z.string().max(200).optional(),
});

export async function interpret(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = interpretSchema.safeParse(req.body);
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
    const billingEntry = await billingService.start(String(req.headers['x-app-id']), principal.contextId, account.name, 'card-insight');
    res.locals.billingEntryId = billingEntry._id.toString();
    let interpretation: string;
    try {
      const result = await adapter.drawCard(parsed.data);
      interpretation = result.interpretation;
      await billingService.succeed(billingEntry._id, 'card-insight', result.provider);
    } catch (err: unknown) {
      await billingService.fail(billingEntry._id).catch((billingErr: unknown) => {
        logger.error({ err: billingErr, billingEntryId: billingEntry._id }, 'Failed to close billing entry');
      });
      logger.error({ err, appId: req.headers['x-app-id'] }, 'AI upstream error (card-insight)');
      sendErr(res, 500, ERROR_CODES.AI_UPSTREAM_ERROR, 'AI 服务暂时不可用，请稍后重试');
      return;
    }

    res.setHeader('X-Billing-Entry-Id', billingEntry._id.toString());
    sendOk(res, { interpretation });
  } catch (err) {
    next(err);
  }
}
