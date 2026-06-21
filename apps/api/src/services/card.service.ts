import mongoose from 'mongoose';
import { StaticCard, IStaticCard } from '../models/static-card.model';
import { IDrawCardRecord } from '../models/draw-card-record.model';
import { User } from '../models/user.model';
import { StaticUserType } from '../models/static-user-type.model';
import { DrawCardRecordRepo, ProfileRepo } from '../repos';
import { getAiAdapter } from '../lib/ai/adapter';
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

async function getDailyLimit(userId: string): Promise<number> {
  const user = await User.findById(userId).select('userType').lean();
  const userTypeKey = user?.userType ?? 'normal';
  const userTypeConfig = await StaticUserType.findOne({ typeKey: userTypeKey })
    .select('dailyCardDrawLimit')
    .lean();
  return userTypeConfig?.dailyCardDrawLimit ?? 0;
}

async function getProfileContext(
  userId: string,
  tenantId: string,
  profileId: string,
): Promise<{ profileName: string; gender: string; baziSummary: string }> {
  const profileRepo = new ProfileRepo(tenantId);
  const userOid = new mongoose.Types.ObjectId(userId);
  try {
    const profile = await profileRepo.findOne({
      _id: new mongoose.Types.ObjectId(profileId),
      userId: userOid,
    });
    if (profile) {
      let baziSummary = '';
      if (profile.baziResult) {
        const bazi = profile.baziResult;
        baziSummary = `年柱${bazi.yearPillar.stem}${bazi.yearPillar.branch}，月柱${bazi.monthPillar.stem}${bazi.monthPillar.branch}，日柱${bazi.dayPillar.stem}${bazi.dayPillar.branch}，时柱${bazi.hourPillar.stem}${bazi.hourPillar.branch}`;
      }
      return { profileName: profile.name, gender: profile.gender, baziSummary };
    }
  } catch (err) {
    log.warn({ err, profileId }, 'Failed to load profile for card draw, proceeding without');
  }
  return { profileName: '用户', gender: 'unknown', baziSummary: '' };
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
    const recordRepo = new DrawCardRecordRepo(tenantId);
    const userOid = new mongoose.Types.ObjectId(userId);

    const dailyLimit = await getDailyLimit(userId);
    const countToday = await recordRepo.countDocuments({ userId: userOid, drawDate: today });
    if (countToday >= dailyLimit) {
      throw new TooManyRequestsError(`今日已达抽卡上限（每日最多 ${dailyLimit} 次）`);
    }

    const drawnCardId = Math.floor(Math.random() * 60) + 1;
    const card = await StaticCard.findOne({ cardId: drawnCardId });
    if (!card) throw new NotFoundError('卡牌数据');

    const { profileName, gender, baziSummary } = profileId
      ? await getProfileContext(userId, tenantId, profileId)
      : { profileName: '用户', gender: 'unknown', baziSummary: '' };

    const ai = await getAiAdapter();
    const aiResult = await ai.drawCard({ cardId: drawnCardId, cardName: card.name, question });

    const record = await recordRepo.create({
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

  async interpretCard(
    userId: string,
    tenantId: string,
    cardId: number,
    profileId: string | undefined,
    question: string | undefined,
  ): Promise<IDrawCardRecord & { card?: IStaticCard }> {
    const today = getTodayString();
    const recordRepo = new DrawCardRecordRepo(tenantId);
    const userOid = new mongoose.Types.ObjectId(userId);

    const dailyLimit = await getDailyLimit(userId);
    const countToday = await recordRepo.countDocuments({ userId: userOid, drawDate: today });
    if (countToday >= dailyLimit) {
      throw new TooManyRequestsError(`今日已达抽卡上限（每日最多 ${dailyLimit} 次）`);
    }

    const card = await StaticCard.findOne({ cardId });
    if (!card) throw new NotFoundError('卡牌数据');

    const { profileName, gender, baziSummary } = profileId
      ? await getProfileContext(userId, tenantId, profileId)
      : { profileName: '用户', gender: 'unknown', baziSummary: '' };

    const ai = await getAiAdapter();
    const aiResult = await ai.drawCard({ cardId, cardName: card.name, question });

    const record = await recordRepo.create({
      userId: userOid,
      profileId: profileId ? new mongoose.Types.ObjectId(profileId) : undefined,
      cardId,
      cardName: card.name,
      question,
      aiInterpretation: aiResult.interpretation,
      aiProvider: aiResult.provider,
      drawDate: today,
    });

    log.info({ tenantId, userId, cardId, recordId: record._id.toString() }, 'Card interpreted');

    const recordObj = record.toObject() as IDrawCardRecord & { card?: IStaticCard };
    recordObj.card = card;
    return recordObj;
  },

  async getDrawHistory(
    userId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ records: IDrawCardRecord[]; meta: ReturnType<typeof paginationMeta> }> {
    const recordRepo = new DrawCardRecordRepo(tenantId);
    const userOid = new mongoose.Types.ObjectId(userId);
    const filter = { userId: userOid };

    const [records, total] = await Promise.all([
      recordRepo.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      recordRepo.countDocuments(filter),
    ]);
    return { records, meta: paginationMeta(total, page, limit) };
  },
};
