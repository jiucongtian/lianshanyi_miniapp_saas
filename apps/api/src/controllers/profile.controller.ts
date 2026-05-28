import { Request, Response, NextFunction } from 'express';
import { IProfile } from '../models/profile.model';
import { profileService, CreateProfileDto } from '../services/profile.service';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('ProfileController');

/** Transform Mongoose profile document to the DTO expected by the web frontend */
function toProfileDTO(profile: IProfile) {
  const bazi = profile.baziResult;
  return {
    id: profile._id.toString(),
    userId: profile.userId.toString(),
    name: profile.name,
    gender: profile.gender,
    birthYear: profile.birthYear,
    birthMonth: profile.birthMonth,
    birthDay: profile.birthDay,
    birthHour: profile.birthHour,
    isLunar: profile.isLunarDate,
    isDefault: profile.isDefaultProfile,
    notes: profile.notes,
    baziResult: bazi
      ? {
          yearPillar: bazi.yearPillar,
          monthPillar: bazi.monthPillar,
          dayPillar: bazi.dayPillar,
          hourPillar: bazi.hourPillar,
          dayMaster: bazi.dayPillar?.stem ?? '',
          wuXingSummary: bazi.wuXingCount ?? {},
        }
      : undefined,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function parseProfileDto(body: Record<string, unknown>): CreateProfileDto {
  const { name, gender, birthYear, birthMonth, birthDay, birthHour, birthMinute, isLunarDate, notes } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new ValidationError('名称不能为空');
  }
  if (gender !== 'male' && gender !== 'female') {
    throw new ValidationError('性别必须为 male 或 female');
  }
  if (typeof birthYear !== 'number' || birthYear < 1900 || birthYear > 2100) {
    throw new ValidationError('出生年份无效');
  }
  if (typeof birthMonth !== 'number' || birthMonth < 1 || birthMonth > 12) {
    throw new ValidationError('出生月份无效（1-12）');
  }
  if (typeof birthDay !== 'number' || birthDay < 1 || birthDay > 31) {
    throw new ValidationError('出生日期无效（1-31）');
  }
  if (typeof birthHour !== 'number' || birthHour < 0 || birthHour > 23) {
    throw new ValidationError('出生时辰无效（0-23）');
  }

  return {
    name: name.trim(),
    gender,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute: typeof birthMinute === 'number' ? birthMinute : undefined,
    isLunarDate: typeof isLunarDate === 'boolean' ? isLunarDate : false,
    notes: notes && typeof notes === 'string' ? notes : undefined,
  };
}

export const profileController = {
  async listProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profiles = await profileService.getProfiles(req.user!.userId, req.user!.tenantId);
      sendSuccess(res, profiles.map(toProfileDTO));
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await profileService.getProfile(
        req.user!.userId,
        req.user!.tenantId,
        req.params['id']!,
      );
      sendSuccess(res, toProfileDTO(profile));
    } catch (err) {
      next(err);
    }
  },

  async createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = parseProfileDto(req.body as Record<string, unknown>);
      const profile = await profileService.createProfile(req.user!.userId, req.user!.tenantId, dto);
      sendSuccess(res, toProfileDTO(profile), 201);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const partial = req.body as Record<string, unknown>;
      const profile = await profileService.updateProfile(
        req.user!.userId,
        req.user!.tenantId,
        req.params['id']!,
        partial as Partial<CreateProfileDto>,
      );
      sendSuccess(res, toProfileDTO(profile));
    } catch (err) {
      next(err);
    }
  },

  async deleteProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await profileService.deleteProfile(req.user!.userId, req.user!.tenantId, req.params['id']!);
      sendSuccess(res, { message: '档案已删除' });
    } catch (err) {
      next(err);
    }
  },

  async setDefault(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await profileService.setDefaultProfile(
        req.user!.userId,
        req.user!.tenantId,
        req.params['id']!,
      );
      sendSuccess(res, toProfileDTO(profile));
    } catch (err) {
      next(err);
    }
  },
};
