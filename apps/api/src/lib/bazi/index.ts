/**
 * BaZi (八字) calculation library
 * Migrated from cloudfunctions/localCalculateBazi_v1_3 (single-version principle)
 * Original: core-converter/bazi-calculator.js + js-calendar-converter-v2.js
 */

// 天干五行映射
const GAN_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// 地支五行映射
const ZHI_WUXING: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { calculateBazi } = require('./bazi-calculator') as {
  calculateBazi: (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute?: number,
  ) => BaziRawResult;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const calendar = require('./js-calendar-converter-v2') as {
  lunar2solar: (
    year: number,
    month: number,
    day: number,
    isLeapMonth: boolean,
  ) => LunarConversionResult | -1;
};

interface LunarConversionResult {
  cYear: number;
  cMonth: number;
  cDay: number;
  [key: string]: unknown;
}

interface BaziPillarRaw {
  gan: string;
  zhi: string;
  ganzhiIndex?: number;
}

interface BaziRawResult {
  success: boolean;
  error?: string;
  baziData?: {
    year: BaziPillarRaw;
    month: BaziPillarRaw;
    day: BaziPillarRaw;
    hour: BaziPillarRaw;
    lunarDate?: { year: number; month: number; day: number; isLeap: boolean };
  };
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BaziInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  isLunar?: boolean;
  isLeapMonth?: boolean;
}

export interface BaziOutput {
  yearPillar: { stem: string; branch: string; stemWuXing: string; branchWuXing: string };
  monthPillar: { stem: string; branch: string; stemWuXing: string; branchWuXing: string };
  dayPillar: { stem: string; branch: string; stemWuXing: string; branchWuXing: string };
  hourPillar: { stem: string; branch: string; stemWuXing: string; branchWuXing: string };
  wuXingCount: Record<string, number>;
  dayMasterStrength?: string;
  nayin?: { year: string; month: string; day: string; hour: string };
  lunarDate?: string;
  // Raw result passthrough
  raw?: Record<string, unknown>;
}

/**
 * Calculate BaZi pillars from solar or lunar date
 */
export function computeBazi(input: BaziInput): BaziOutput {
  const { year, month, day, hour, minute = 0, isLunar = false, isLeapMonth = false } = input;

  let solarYear = year;
  let solarMonth = month;
  let solarDay = day;

  if (isLunar) {
    const lunarResult = calendar.lunar2solar(year, month, day, isLeapMonth);
    if (lunarResult === -1) {
      throw new Error('农历日期无效或超出支持范围（1900-2100）');
    }
    solarYear = lunarResult.cYear;
    solarMonth = lunarResult.cMonth;
    solarDay = lunarResult.cDay;
  }

  const result = calculateBazi(solarYear, solarMonth, solarDay, hour, minute);

  if (!result.success) {
    throw new Error(result.error ?? '八字计算失败');
  }

  // Map raw result fields — bazi-calculator.js returns baziData.{year,month,day,hour}.{gan,zhi}
  const bd = result.baziData;
  if (!bd) throw new Error('八字计算结果缺少 baziData');

  const toTypedPillar = (p: BaziPillarRaw): BaziOutput['yearPillar'] => ({
    stem: p.gan,
    branch: p.zhi,
    stemWuXing: GAN_WUXING[p.gan] ?? '',
    branchWuXing: ZHI_WUXING[p.zhi] ?? '',
  });

  const pillars = [bd.year, bd.month, bd.day, bd.hour];
  const wuXingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    const sw = GAN_WUXING[p.gan];
    const bw = ZHI_WUXING[p.zhi];
    if (sw) wuXingCount[sw] = (wuXingCount[sw] ?? 0) + 1;
    if (bw) wuXingCount[bw] = (wuXingCount[bw] ?? 0) + 1;
  }

  return {
    yearPillar: toTypedPillar(bd.year),
    monthPillar: toTypedPillar(bd.month),
    dayPillar: toTypedPillar(bd.day),
    hourPillar: toTypedPillar(bd.hour),
    wuXingCount,
    dayMasterStrength: undefined,
    nayin: undefined,
    lunarDate: isLunar
      ? `农历${year}年${isLeapMonth ? '闰' : ''}${month}月${day}日`
      : undefined,
    raw: result as Record<string, unknown>,
  };
}

/**
 * Get the heavenly stem and earthly branch for a given date
 * Used by daily insight job
 */
export function getDayGanZhi(year: number, month: number, day: number): {
  stem: string;
  branch: string;
} {
  const result = calculateBazi(year, month, day, 12, 0);
  if (!result.success) {
    throw new Error('干支计算失败');
  }
  const dayGanZhi = result.baziData?.day;
  return {
    stem: dayGanZhi?.gan ?? '',
    branch: dayGanZhi?.zhi ?? '',
  };
}
