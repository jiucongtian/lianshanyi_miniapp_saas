import { Request, Response, NextFunction } from 'express';
import { cardService } from '../services/card.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('CardController');

export const cardController = {
  async listCards(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cards = await cardService.listCards();
      sendSuccess(res, cards);
    } catch (err) {
      next(err);
    }
  },

  async getCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cardId = parseInt(req.params['cardId']!, 10);
      if (isNaN(cardId) || cardId < 1 || cardId > 60) {
        throw new ValidationError('卡牌ID无效（1-60）');
      }
      const card = await cardService.getCard(cardId);
      sendSuccess(res, card);
    } catch (err) {
      next(err);
    }
  },

  async drawCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId, question } = req.body as {
        profileId?: unknown;
        question?: unknown;
      };
      const record = await cardService.drawCard(
        req.user!.userId,
        profileId && typeof profileId === 'string' ? profileId : undefined,
        question && typeof question === 'string' ? question : undefined,
      );
      sendSuccess(res, record, 201);
    } catch (err) {
      next(err);
    }
  },

  async getDrawHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));
      const { records, meta } = await cardService.getDrawHistory(req.user!.userId, page, limit);
      sendSuccess(res, records, 200, meta);
    } catch (err) {
      next(err);
    }
  },
};
