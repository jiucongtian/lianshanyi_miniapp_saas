import mongoose from 'mongoose';
import { DailyInsight, IDailyInsight } from '../models/daily-insight.model';
import { StaticCard } from '../models/static-card.model';
import { getDayGanZhi } from '../lib/bazi';
import { getAiAdapter } from '../lib/ai/adapter';
import { NotFoundError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('DailyInsightService');

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Deterministically pick a card (1-60) from a date string.
 * Uses day-of-year % 60 + 1 so the same date always maps to the same card.
 */
function dateToCardId(dateStr: string): number {
  const date = new Date(dateStr);
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return (dayOfYear % 60) + 1;
}

export const dailyInsightService = {
  async getTodayInsight(tenantId: string): Promise<IDailyInsight> {
    const today = getTodayString();
    const insight = await DailyInsight.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      date: today,
    });
    if (!insight) throw new NotFoundError('今日运势尚未生成');
    return insight;
  },

  async getInsightByDate(tenantId: string, date: string): Promise<IDailyInsight> {
    const insight = await DailyInsight.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      date,
    });
    if (!insight) throw new NotFoundError(`${date} 的运势尚未生成`);
    return insight;
  },

  async generateForDate(tenantId: string, date: string): Promise<IDailyInsight> {
    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const cardId = dateToCardId(date);

    const card = await StaticCard.findOne({ cardId });
    const cardName = card?.name ?? `第${cardId}卦`;

    const dateParts = date.split('-').map(Number);
    const ganZhi = getDayGanZhi(dateParts[0]!, dateParts[1]!, dateParts[2]!);

    const ai = await getAiAdapter();
    const result = await ai.generateDailyInsight({ date, cardName });

    const insight = await DailyInsight.findOneAndUpdate(
      { tenantId: tenantOid, date },
      {
        tenantId: tenantOid,
        date,
        cardId,
        cardName,
        dayStem: ganZhi.stem,
        dayBranch: ganZhi.branch,
        title: result.title,
        summary: result.summary,
        fullText: result.fullText,
        luckyDirection: result.luckyDirection,
        luckyColor: result.luckyColor,
        luckyNumber: result.luckyNumber,
        aiGenerated: true,
        aiProvider: result.provider,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    log.info({ tenantId, date, cardId, insightId: insight!._id.toString() }, 'Daily insight generated');
    return insight!;
  },
};
