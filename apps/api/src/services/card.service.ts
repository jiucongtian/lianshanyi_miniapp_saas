import mongoose from 'mongoose';
import { StaticCard, IStaticCard } from '../models/static-card.model';
import { DrawCardRecord, IDrawCardRecord } from '../models/draw-card-record.model';
import { Tenant } from '../models/tenant.model';
import { User } from '../models/user.model';
import { StaticUserType } from '../models/static-user-type.model';
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
    tenantId: string,
    profileId: string | undefined,
    question: string | undefined,
  ): Promise<IDrawCardRecord & { card?: IStaticCard }> {
    const today = getTodayString();
    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const userOid = new mongoose.Types.ObjectId(userId);

    // Determine daily draw limit: user-type config takes priority over tenant default
    const [user, tenant] = await Promise.all([
      User.findById(userOid).select('userType').lean(),
      Tenant.findById(tenantOid).select('limits').lean(),
    ]);

    const userTypeKey = user?.userType ?? 'normal';
    const userTypeConfig = await StaticUserType.findOne({ typeKey: userTypeKey })
      .select('dailyCardDrawLimit')
      .lean();

    // Use user-type limit if configured; otherwise fall back to tenant default
    const dailyLimit =
      userTypeConfig?.dailyCardDrawLimit ?? tenant?.limits?.dailyDrawCount ?? 1;

    const countToday = await DrawCardRecord.countDocuments({
      tenantId: tenantOid,
      userId: userOid,
      drawDate: today,
    });
    if (countToday >= dailyLimit) {
      throw new TooManyRequestsError(
        `今日已达抽卡上限（每日最多 ${dailyLimit} 次）`,
      );
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
          tenantId: tenantOid,
          userId: userOid,
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
      tenantId: tenantOid,
      userId: userOid,
      profileId: profileId ? new mongoose.Types.ObjectId(profileId) : undefined,
      cardId: drawnCardId,
      cardName: card.name,
      question,
      aiInterpretation: aiResult.interpretation,
      aiProvider: aiResult.provider,
      drawDate: today,
    });

    log.info({ tenantId, userId, cardId: drawnCardId, recordId: record._id.toString() }, 'Card drawn');

    const recordObj = record.toObject() as IDrawCardRecord & { card?: IStaticCard };
    recordObj.card = card;
    return recordObj;
  },

  async getDrawHistory(
    userId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{
    records: IDrawCardRecord[];
    meta: ReturnType<typeof paginationMeta>;
  }> {
    const query = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      userId: new mongoose.Types.ObjectId(userId),
    };
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
