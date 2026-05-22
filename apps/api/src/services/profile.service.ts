import mongoose from 'mongoose';
import { Profile, IProfile } from '../models/profile.model';
import { computeBazi } from '../lib/bazi';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('ProfileService');

export interface CreateProfileDto {
  name: string;
  gender: 'male' | 'female';
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  isLunarDate?: boolean;
  notes?: string;
}

function computeBaziForProfile(dto: Pick<CreateProfileDto, 'birthYear' | 'birthMonth' | 'birthDay' | 'birthHour' | 'birthMinute' | 'isLunarDate'>) {
  try {
    return computeBazi({
      year: dto.birthYear,
      month: dto.birthMonth,
      day: dto.birthDay,
      hour: dto.birthHour,
      minute: dto.birthMinute ?? 0,
      isLunar: dto.isLunarDate ?? false,
    });
  } catch (err) {
    log.warn({ err }, 'BaZi computation failed, storing without baziResult');
    return undefined;
  }
}

export const profileService = {
  async getProfiles(userId: string): Promise<IProfile[]> {
    return Profile.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ isDefaultProfile: -1, createdAt: 1 })
      .exec();
  },

  async getProfile(userId: string, profileId: string): Promise<IProfile> {
    const profile = await Profile.findById(profileId);
    if (!profile) throw new NotFoundError('档案');
    if (profile.userId.toString() !== userId) throw new ForbiddenError('无权访问此档案');
    return profile;
  },

  async createProfile(userId: string, data: CreateProfileDto): Promise<IProfile> {
    const existingCount = await Profile.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
    });
    const isFirst = existingCount === 0;

    const baziResult = computeBaziForProfile(data);

    const profile = await Profile.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: data.name,
      gender: data.gender,
      birthYear: data.birthYear,
      birthMonth: data.birthMonth,
      birthDay: data.birthDay,
      birthHour: data.birthHour,
      birthMinute: data.birthMinute,
      isLunarDate: data.isLunarDate ?? false,
      isDefaultProfile: isFirst,
      baziResult,
      notes: data.notes,
    });

    log.info({ userId, profileId: profile._id.toString() }, 'Profile created');
    return profile;
  },

  async updateProfile(
    userId: string,
    profileId: string,
    data: Partial<CreateProfileDto>,
  ): Promise<IProfile> {
    const profile = await Profile.findById(profileId);
    if (!profile) throw new NotFoundError('档案');
    if (profile.userId.toString() !== userId) throw new ForbiddenError('无权修改此档案');

    const birthFieldsChanged =
      data.birthYear !== undefined ||
      data.birthMonth !== undefined ||
      data.birthDay !== undefined ||
      data.birthHour !== undefined ||
      data.birthMinute !== undefined ||
      data.isLunarDate !== undefined;

    const updatedFields: Partial<IProfile> = {};
    if (data.name !== undefined) updatedFields.name = data.name;
    if (data.gender !== undefined) updatedFields.gender = data.gender;
    if (data.birthYear !== undefined) updatedFields.birthYear = data.birthYear;
    if (data.birthMonth !== undefined) updatedFields.birthMonth = data.birthMonth;
    if (data.birthDay !== undefined) updatedFields.birthDay = data.birthDay;
    if (data.birthHour !== undefined) updatedFields.birthHour = data.birthHour;
    if (data.birthMinute !== undefined) updatedFields.birthMinute = data.birthMinute;
    if (data.isLunarDate !== undefined) updatedFields.isLunarDate = data.isLunarDate;
    if (data.notes !== undefined) updatedFields.notes = data.notes;

    if (birthFieldsChanged) {
      const merged = {
        birthYear: data.birthYear ?? profile.birthYear,
        birthMonth: data.birthMonth ?? profile.birthMonth,
        birthDay: data.birthDay ?? profile.birthDay,
        birthHour: data.birthHour ?? profile.birthHour,
        birthMinute: data.birthMinute ?? profile.birthMinute,
        isLunarDate: data.isLunarDate ?? profile.isLunarDate,
      };
      const baziResult = computeBaziForProfile(merged);
      if (baziResult) updatedFields.baziResult = baziResult;
    }

    const updated = await Profile.findByIdAndUpdate(profileId, updatedFields, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new NotFoundError('档案');

    log.info({ userId, profileId }, 'Profile updated');
    return updated;
  },

  async deleteProfile(userId: string, profileId: string): Promise<void> {
    const profile = await Profile.findById(profileId);
    if (!profile) throw new NotFoundError('档案');
    if (profile.userId.toString() !== userId) throw new ForbiddenError('无权删除此档案');

    const wasDefault = profile.isDefaultProfile;
    await Profile.deleteOne({ _id: profileId });

    if (wasDefault) {
      // Assign default to the oldest remaining profile
      const next = await Profile.findOne({ userId: new mongoose.Types.ObjectId(userId) }).sort({
        createdAt: 1,
      });
      if (next) {
        await Profile.updateOne({ _id: next._id }, { isDefaultProfile: true });
      }
    }

    log.info({ userId, profileId }, 'Profile deleted');
  },

  async setDefaultProfile(userId: string, profileId: string): Promise<IProfile> {
    const profile = await Profile.findById(profileId);
    if (!profile) throw new NotFoundError('档案');
    if (profile.userId.toString() !== userId) throw new ForbiddenError('无权修改此档案');

    // Unset all, then set the target
    await Profile.updateMany(
      { userId: new mongoose.Types.ObjectId(userId) },
      { isDefaultProfile: false },
    );
    const updated = await Profile.findByIdAndUpdate(
      profileId,
      { isDefaultProfile: true },
      { new: true },
    );
    if (!updated) throw new NotFoundError('档案');

    log.info({ userId, profileId }, 'Default profile set');
    return updated;
  },
};
