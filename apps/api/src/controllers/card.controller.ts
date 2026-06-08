import { Request, Response, NextFunction } from 'express';
import { IStaticCard } from '../models/static-card.model';
import { IDrawCardRecord } from '../models/draw-card-record.model';
import { cardService } from '../services/card.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('CardController');

/** Transform raw Mongoose card document to the DTO expected by the web frontend */
function toCardDTO(card: IStaticCard) {
  const wuXing = card.wuXingElement ?? '';
  return {
    id: card._id.toString(),
    name: card.name,
    stem: card.heavenlyStem,
    branch: card.earthlyBranch,
    stemWuXing: wuXing.charAt(0),
    branchWuXing: wuXing.charAt(1),
    nayin: card.nayin,
    description: card.description ?? '',
    sequence: card.cardId,
  };
}

/** Transform draw record + embedded card to the DTO expected by the web frontend */
function toDrawRecordDTO(
  record: IDrawCardRecord & { card?: IStaticCard },
) {
  return {
    id: record._id.toString(),
    userId: record.userId.toString(),
    profileId: record.profileId?.toString(),
    card: record.card ? toCardDTO(record.card) : undefined,
    cardId: record.cardId,
    cardName: record.cardName,
    question: record.question,
    interpretation: record.aiInterpretation ?? '',
    createdAt: record.createdAt,
  };
}

export const cardController = {
  async listCards(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cards = await cardService.listCards();
      sendSuccess(res, cards.map(toCardDTO));
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
      sendSuccess(res, toCardDTO(card));
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
        req.user!.tenantId,
        profileId && typeof profileId === 'string' ? profileId : undefined,
        question && typeof question === 'string' ? question : undefined,
      );
      sendSuccess(res, toDrawRecordDTO(record), 201);
    } catch (err) {
      next(err);
    }
  },

  async interpretCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cardId, profileId, question } = req.body as {
        cardId?: unknown;
        profileId?: unknown;
        question?: unknown;
      };
      if (typeof cardId !== 'number' || cardId < 1 || cardId > 60) {
        throw new ValidationError('cardId 必须是 1-60 的整数');
      }
      const record = await cardService.interpretCard(
        req.user!.userId,
        req.user!.tenantId,
        cardId,
        profileId && typeof profileId === 'string' ? profileId : undefined,
        question && typeof question === 'string' ? question : undefined,
      );
      sendSuccess(res, toDrawRecordDTO(record), 201);
    } catch (err) {
      next(err);
    }
  },

  async getDrawHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));
      const { records, meta } = await cardService.getDrawHistory(
        req.user!.userId,
        req.user!.tenantId,
        page,
        limit,
      );
      sendSuccess(res, records.map((r) => toDrawRecordDTO(r as IDrawCardRecord & { card?: IStaticCard })), 200, meta);
    } catch (err) {
      next(err);
    }
  },
};
