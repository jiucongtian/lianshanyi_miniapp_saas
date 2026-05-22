import mongoose from 'mongoose';
import { Profile } from '../models/profile.model';
import { getAiAdapter, AssistantMessage, AssistantChatResult } from '../lib/ai/adapter';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('AssistantService');

export const assistantService = {
  async chat(
    userId: string,
    messages: AssistantMessage[],
    conversationId?: string,
    profileId?: string,
  ): Promise<AssistantChatResult> {
    let profileContext: string | undefined;
    if (profileId) {
      profileContext = await assistantService.getProfileContext(profileId, userId);
    }

    const ai = await getAiAdapter();
    const result = await ai.assistantChat({
      conversationId,
      messages,
      profileContext,
    });

    log.info({ userId, conversationId: result.conversationId }, 'Assistant chat completed');
    return result;
  },

  async getProfileContext(profileId: string, userId: string): Promise<string> {
    let profile;
    try {
      profile = await Profile.findOne({
        _id: new mongoose.Types.ObjectId(profileId),
        userId: new mongoose.Types.ObjectId(userId),
      });
    } catch {
      throw new NotFoundError('档案');
    }

    if (!profile) throw new NotFoundError('档案');
    if (profile.userId.toString() !== userId) throw new ForbiddenError('无权访问此档案');

    const parts: string[] = [
      `姓名：${profile.name}`,
      `性别：${profile.gender === 'male' ? '男' : '女'}`,
      `出生：${profile.birthYear}年${profile.birthMonth}月${profile.birthDay}日${profile.birthHour}时`,
    ];

    if (profile.isLunarDate) {
      parts.push('（农历）');
    }

    if (profile.baziResult) {
      const bazi = profile.baziResult;
      parts.push(
        `八字：年柱${bazi.yearPillar.stem}${bazi.yearPillar.branch}，` +
          `月柱${bazi.monthPillar.stem}${bazi.monthPillar.branch}，` +
          `日柱${bazi.dayPillar.stem}${bazi.dayPillar.branch}，` +
          `时柱${bazi.hourPillar.stem}${bazi.hourPillar.branch}`,
      );

      const wuXing = bazi.wuXingCount;
      if (wuXing && Object.keys(wuXing).length > 0) {
        const wuXingStr = Object.entries(wuXing)
          .map(([k, v]) => `${k}${v}`)
          .join('，');
        parts.push(`五行：${wuXingStr}`);
      }

      if (bazi.dayMasterStrength) {
        parts.push(`日主强弱：${bazi.dayMasterStrength}`);
      }

      if (bazi.nayin) {
        parts.push(
          `纳音：年${bazi.nayin.year}，月${bazi.nayin.month}，日${bazi.nayin.day}，时${bazi.nayin.hour}`,
        );
      }
    }

    if (profile.notes) {
      parts.push(`备注：${profile.notes}`);
    }

    return parts.join('；');
  },
};
