import { Request, Response, NextFunction } from 'express';
import { dailyInsightService } from '../services/daily-insight.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('DailyInsightController');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const dailyInsightController = {
  async getTodayInsight(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const insight = await dailyInsightService.getTodayInsight();
      sendSuccess(res, insight);
    } catch (err) {
      next(err);
    }
  },

  async getInsightByDate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date } = req.params;
      if (!date || !DATE_REGEX.test(date)) {
        throw new ValidationError('日期格式无效，请使用 YYYY-MM-DD');
      }
      const insight = await dailyInsightService.getInsightByDate(date);
      sendSuccess(res, insight);
    } catch (err) {
      next(err);
    }
  },
};
