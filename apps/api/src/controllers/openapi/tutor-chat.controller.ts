import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAiAdapter } from '../../lib/ai/adapter';
import { Tenant } from '../../models/tenant.model';
import { sendOk, sendErr, ERROR_CODES } from '../../lib/openapi/response';
import { logger } from '../../utils/logger';
import { billingService } from '../../services/billing.service';

const chatSchema = z.object({
  content: z.string().min(1, '问题不能为空').max(2000, '问题不能超过 2000 字'),
  conversationId: z.string().optional(),
});

export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      sendErr(res, 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.errors[0].message);
      return;
    }

    const { content, conversationId } = parsed.data;
    const principal = req.principal!;

    const account = await Tenant.findById(principal.contextId).lean();
    if (!account) {
      sendErr(res, 403, ERROR_CODES.FORBIDDEN_SCOPE, '凭据未绑定有效账户');
      return;
    }

    const adapter = await getAiAdapter();
    const billingEntry = await billingService.start(String(req.headers['x-app-id']), principal.contextId, account.name, 'tutor-chat');
    res.locals.billingEntryId = billingEntry._id.toString();
    let reply: string;
    let newConversationId: string;
    try {
      const result = await adapter.assistantChat({
        conversationId,
        messages: [{ role: 'user', content }],
      });
      reply = result.reply;
      newConversationId = result.conversationId;
      await billingService.succeed(billingEntry._id, 'tutor-chat', result.provider);
    } catch (err: unknown) {
      await billingService.fail(billingEntry._id).catch((billingErr: unknown) => {
        logger.error({ err: billingErr, billingEntryId: billingEntry._id }, 'Failed to close billing entry');
      });
      logger.error({ err, appId: req.headers['x-app-id'] }, 'AI upstream error (tutor-chat)');
      sendErr(res, 500, ERROR_CODES.AI_UPSTREAM_ERROR, 'AI 服务暂时不可用，请稍后重试');
      return;
    }

    res.setHeader('X-Billing-Entry-Id', billingEntry._id.toString());
    sendOk(res, { reply, conversationId: newConversationId });
  } catch (err) {
    next(err);
  }
}
