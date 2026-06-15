import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAiAdapter } from '../../lib/ai/adapter';
import { Tenant } from '../../models/tenant.model';
import { sendOk, sendErr, ERROR_CODES } from '../../lib/openapi/response';
import { logger } from '../../utils/logger';

const MAX_CONTENT_LENGTH = 2000;

const chatSchema = z.object({
  content: z.string().min(1, '问题不能为空').max(MAX_CONTENT_LENGTH, `问题不能超过 ${MAX_CONTENT_LENGTH} 字`),
});

export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      sendErr(res, 400, ERROR_CODES.VALIDATION_ERROR, parsed.error.errors[0].message);
      return;
    }

    const { content } = parsed.data;
    const principal = req.principal!;

    // Load AI config from bound Account
    const account = await Tenant.findById(principal.contextId).lean();
    if (!account) {
      sendErr(res, 403, ERROR_CODES.FORBIDDEN_SCOPE, '凭据未绑定有效账户');
      return;
    }

    // Temporarily override AI_PROVIDER env if account has specific config
    // (production: getAiAdapter should accept config param — simplified here)
    const adapter = await getAiAdapter();
    let reply: string;
    try {
      const result = await adapter.assistantChat({
        messages: [{ role: 'user', content }],
      });
      reply = result.reply;
    } catch (err: unknown) {
      logger.error({ err, appId: req.headers['x-app-id'] }, 'AI upstream error');
      sendErr(res, 500, ERROR_CODES.AI_UPSTREAM_ERROR, 'AI 服务暂时不可用，请稍后重试');
      return;
    }

    // Single-turn: return only reply, no conversationId
    sendOk(res, { reply });
  } catch (err) {
    next(err);
  }
}
