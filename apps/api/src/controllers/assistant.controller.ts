import { Request, Response, NextFunction } from 'express';
import { assistantService } from '../services/assistant.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { AssistantMessage } from '../lib/ai/adapter';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('AssistantController');

export const assistantController = {
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { messages, conversationId, profileId } = req.body as {
        messages?: unknown;
        conversationId?: unknown;
        profileId?: unknown;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        throw new ValidationError('messages 不能为空');
      }

      const validatedMessages: AssistantMessage[] = messages.map((msg, i) => {
        if (typeof msg !== 'object' || msg === null) {
          throw new ValidationError(`messages[${i}] 格式无效`);
        }
        const m = msg as Record<string, unknown>;
        if (m['role'] !== 'user' && m['role'] !== 'assistant') {
          throw new ValidationError(`messages[${i}].role 必须为 user 或 assistant`);
        }
        if (typeof m['content'] !== 'string' || m['content'].trim() === '') {
          throw new ValidationError(`messages[${i}].content 不能为空`);
        }
        return { role: m['role'] as 'user' | 'assistant', content: m['content'] as string };
      });

      const result = await assistantService.chat(
        req.user!.userId,
        validatedMessages,
        conversationId && typeof conversationId === 'string' ? conversationId : undefined,
        profileId && typeof profileId === 'string' ? profileId : undefined,
      );

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
};
