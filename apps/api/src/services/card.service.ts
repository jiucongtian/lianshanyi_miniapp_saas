import mongoose from 'mongoose';
import { StaticCard, IStaticCard } from '../models/static-card.model';
import { DrawCardRecord, IDrawCardRecord } from '../models/draw-card-record.model';
import { getAiAdapter } from '../lib/ai/adapter';
import { Profile } from '../models/profile.model';
import { NotFoundError, TooManyRequestsError } from '../utils/errors';
import { paginationMeta } from '../utils/response';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('CardService');

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const cardService = {
  async listCards(): Promise<IStaticCard[]> {
    return StaticCard.find().sort({ sortOrder: 1 }).exec();
  },

  async getCard(cardId: number): Promise<IStaticCard> {
    const card = await StaticCard.findOne({ cardId });
    if (!card) throw new NotFoundError('卡牌');
    return card;
  },

  async drawCard(
    userId: string,
    profileId: string | undefined,
    question: string | undefined,
  ): Promise<IDrawCardRecord & { card?: IStaticCard }> {
    const today = getTodayString();

    // Check daily draw limit
    const existingToday = await DrawCardRecord.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      drawDate: today,
    });
    if (existingToday) {
      throw new TooManyRequestsError('今日已抽过牌，每日仅限抽一次');
    }

    // Random card 1-60
    const drawnCardId = Math.floor(Math.random() * 60) + 1;
    const card = await StaticCard.findOne({ cardId: drawnCardId });
    if (!card) throw new NotFoundError('卡牌数据');

    // Build AI input - get profile context if provided
    let profileName = '用户';
    let gender = 'unknown';
    let baziSummary = '';

    if (profileId) {
      try {
        const profile = await Profile.findOne({
          _id: new mongoose.Types.ObjectId(profileId),
          userId: new mongoose.Types.ObjectId(userId),
        });
        if (profile) {
          profileName = profile.name;
          gender = profile.gender;
          if (profile.baziResult) {
            const bazi = profile.baziResult;
            baziSummary = `年柱${bazi.yearPillar.stem}${bazi.yearPillar.branch}，月柱${bazi.monthPillar.stem}${bazi.monthPillar.branch}，日柱${bazi.dayPillar.stem}${bazi.dayPillar.branch}，时柱${bazi.hourPillar.stem}${bazi.hourPillar.branch}`;
          }
        }
      } catch (err) {
        log.warn({ err, profileId }, 'Failed to load profile for card draw, proceeding without');
      }
    }

    const ai = await getAiAdapter();
    const aiResult = await ai.drawCard({
      profileName,
      gender,
      baziSummary,
      question,
      cardId: drawnCardId,
      cardName: card.name,
    });

    const record = await DrawCardRecord.create({
      userId: new mongoose.Types.ObjectId(userId),
      profileId: profileId ? new mongoose.Types.ObjectId(profileId) : undefined,
      cardId: drawnCardId,
      cardName: card.name,
      question,
      aiInterpretation: aiResult.interpretation,
      aiProvider: aiResult.provider,
      drawDate: today,
    });

    log.info({ userId, cardId: drawnCardId, recordId: record._id.toString() }, 'Card drawn');

    const recordObj = record.toObject() as IDrawCardRecord & { card?: IStaticCard };
    recordObj.card = card;
    return recordObj;
  },

  async getDrawHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    records: IDrawCardRecord[];
    meta: ReturnType<typeof paginationMeta>;
  }> {
    const query = { userId: new mongoose.Types.ObjectId(userId) };
    const [records, total] = await Promise.all([
      DrawCardRecord.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      DrawCardRecord.countDocuments(query),
    ]);
    return { records, meta: paginationMeta(total, page, limit) };
  },
};
