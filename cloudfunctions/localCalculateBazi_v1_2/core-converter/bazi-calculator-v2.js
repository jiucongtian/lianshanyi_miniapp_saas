/**
 * 生辰八字计算器 v2
 *
 * 与 bazi-calculator.js 的区别：
 * - 年柱、月柱完全基于 solar-terms-compressed-original.js 的分钟级节气时刻计算
 * - 年柱以立春为界切换（不再依赖 js-calendar-converter 的 gzYear/春节边界）
 * - 月柱以当月"节"为界切换（不再依赖 gzMonth 加补丁的方式）
 * - 节气边界判断：以时辰为粒度。节气落在出生时辰内，整个时辰归为"节气后"；
 *   出生时辰整体在节气前，才归为"节气前"。与老代码逻辑一致。
 * - 日柱、时柱、农历字段继续使用 js-calendar-converter（纯日期计算，无节气依赖）
 *
 * 时区假设：出生时间为北京时间 (UTC+8)，云函数运行环境也是 UTC+8。
 * solar-terms-compressed-original.js 内部使用 new Date(year, 0, 1) 本地时间，与此一致。
 */

const calendar = require('./js-calendar-converter-v2.cjs');

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 60甲子索引表
const GANZHI_INDEX = {
  '甲子': 1,  '乙丑': 2,  '丙寅': 3,  '丁卯': 4,  '戊辰': 5,  '己巳': 6,
  '庚午': 7,  '辛未': 8,  '壬申': 9,  '癸酉': 10, '甲戌': 11, '乙亥': 12,
  '丙子': 13, '丁丑': 14, '戊寅': 15, '己卯': 16, '庚辰': 17, '辛巳': 18,
  '壬午': 19, '癸未': 20, '甲申': 21, '乙酉': 22, '丙戌': 23, '丁亥': 24,
  '戊子': 25, '己丑': 26, '庚寅': 27, '辛卯': 28, '壬辰': 29, '癸巳': 30,
  '甲午': 31, '乙未': 32, '丙申': 33, '丁酉': 34, '戊戌': 35, '己亥': 36,
  '庚子': 37, '辛丑': 38, '壬寅': 39, '癸卯': 40, '甲辰': 41, '乙巳': 42,
  '丙午': 43, '丁未': 44, '戊申': 45, '己酉': 46, '庚戌': 47, '辛亥': 48,
  '壬子': 49, '癸丑': 50, '甲寅': 51, '乙卯': 52, '丙辰': 53, '丁巳': 54,
  '戊午': 55, '己未': 56, '庚申': 57, '辛酉': 58, '壬戌': 59, '癸亥': 60
};

/**
 * 获取给定时辰的结束时刻（用于时辰边界判断）
 *
 * 生产输入格式：hour 为偶数（0/2/4/.../22），minute=1。
 * 各时辰范围（以偶数小时代表）：
 *   子时(0)→23:00-01:00  丑时(2)→01:00-03:00  寅时(4)→03:00-05:00
 *   卯时(6)→05:00-07:00  辰时(8)→07:00-09:00  巳时(10)→09:00-11:00
 *   午时(12)→11:00-13:00 未时(14)→13:00-15:00 申时(16)→15:00-17:00
 *   酉时(18)→17:00-19:00 戌时(20)→19:00-21:00 亥时(22)→21:00-23:00
 */
function getShichenSlotEnd(year, month, day, hour) {
  if (hour === 0) return new Date(year, month - 1, day, 1, 0, 0);
  return new Date(year, month - 1, day, hour + 1, 0, 0);
}

/**
 * 判断出生时辰是否整体在节气时刻之前
 * - 出生日期 != 节气日期：直接比日期
 * - 出生日期 == 节气日期：比时辰末端 vs 节气时刻
 *   若 termTime >= slotEnd → 整个时辰都在节气前 → true
 *   否则（节气在时辰内或时辰后）→ 归为"节气后" → false
 */
function isBirthBeforeTerm(year, month, day, hour, minute, termTime) {
  if (termTime.getFullYear() === year &&
      termTime.getMonth() + 1 === month &&
      termTime.getDate()      === day) {
    const slotEnd = getShichenSlotEnd(year, month, day, hour);
    return termTime >= slotEnd;
  }
  return new Date(year, month - 1, day, hour, minute) < termTime;
}

/**
 * 计算年柱
 * 以立春为界：出生时辰整体在立春前→上一干支年，否则→本干支年
 */
function computeYearPillar(year, month, day, hour, minute) {
  const lichunTime = calendar.getSolarTermTime(year, 2); // 立春 = 索引2
  if (!lichunTime) {
    throw new Error(`无法获取 ${year} 年立春时刻，年份超出支持范围`);
  }
  const effectiveYear = isBirthBeforeTerm(year, month, day, hour, minute, lichunTime)
    ? year - 1 : year;
  const ganIdx = ((effectiveYear - 4) % 10 + 10) % 10;
  const zhiIdx = ((effectiveYear - 4) % 12 + 12) % 12;
  return { gan: GAN[ganIdx], zhi: ZHI[zhiIdx], ganIdx, effectiveYear };
}

/**
 * 计算月柱
 * 以当月"节"为界（时辰粒度）：出生时辰整体在节前→上月节气周期，否则→本月节气周期
 *
 * 节气月与公历月的对应（节气索引 = (month-1)*2）：
 *   1月→小寒(0)  2月→立春(2)  3月→惊蛰(4)  4月→清明(6)
 *   5月→立夏(8)  6月→芒种(10) 7月→小暑(12) 8月→立秋(14)
 *   9月→白露(16) 10月→寒露(18) 11月→立冬(20) 12月→大雪(22)
 *
 * 跨年子月：1月小寒前出生时仍在上年子月，但 yearPillar 已因立春前而取上一干支年，
 * 所以 yearPillar.ganIdx 天然是正确的年干，月干推算无需特殊处理。
 */
function computeMonthPillar(year, month, day, hour, minute, yearPillar) {
  const termIdx  = (month - 1) * 2; // 当月"节"在节气表中的索引
  const termTime = calendar.getSolarTermTime(year, termIdx);
  if (!termTime) {
    throw new Error(`无法获取 ${year} 年节气 ${termIdx} 时刻，年份超出支持范围`);
  }

  let effectiveSolarMonth;
  if (!isBirthBeforeTerm(year, month, day, hour, minute, termTime)) {
    effectiveSolarMonth = month;     // 已过当月节（或节气在本时辰内）
  } else if (month === 1) {
    effectiveSolarMonth = 12;        // 1月小寒前 → 子月（上年大雪后的周期）
  } else {
    effectiveSolarMonth = month - 1; // 未过当月节 → 上月节气周期
  }

  // 月支：effectiveSolarMonth % 12（1→丑=1, 2→寅=2, ..., 12→子=0）
  const zhiIdx = effectiveSolarMonth % 12;

  // 月干：由年干起推。寅月(effectiveSolarMonth=2)为起点
  // 起寅月天干索引 = ((yearGanIdx % 5) * 2 + 2) % 10
  // 甲/己年→丙(2), 乙/庚年→戊(4), 丙/辛年→庚(6), 丁/壬年→壬(8), 戊/癸年→甲(0)
  const startStemForYin = ((yearPillar.ganIdx % 5) * 2 + 2) % 10;
  const offset = ((effectiveSolarMonth - 2) % 12 + 12) % 12;
  const ganIdx = (startStemForYin + offset) % 10;

  return { gan: GAN[ganIdx], zhi: ZHI[zhiIdx] };
}

/**
 * 计算时柱
 * 从 bazi-calculator.js 原样复制，逻辑不变
 */
function calculateHourGanZhi(dayGanZhi, hour) {
  const Gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const Zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  let zhiNumber;
  if (hour >= 23 || hour < 1) {
    zhiNumber = 1;
  } else {
    zhiNumber = Math.floor((hour + 1) / 2) + 1;
  }

  const dayGan = dayGanZhi.charAt(0);
  const dayGanIndex = Gan.indexOf(dayGan);
  if (dayGanIndex === -1) throw new Error(`无效的日干：${dayGan}`);

  const dayGanNumber = dayGanIndex + 1;
  let hourGanNumber = dayGanNumber * 2 + zhiNumber - 2;
  while (hourGanNumber > 10) hourGanNumber -= 10;
  while (hourGanNumber < 1)  hourGanNumber += 10;

  return Gan[hourGanNumber - 1] + Zhi[zhiNumber - 1];
}

function getGanZhiIndex(gan, zhi) {
  const key = gan + zhi;
  const idx = GANZHI_INDEX[key];
  if (!idx) throw new Error(`无效的干支：${key}`);
  return idx;
}

/**
 * 计算生辰八字（主入口）
 * @param {number} year  - 公历年
 * @param {number} month - 公历月（1-12）
 * @param {number} day   - 公历日
 * @param {number} hour  - 小时（0-23，北京时间）
 * @param {number} minute - 分钟（0-59）
 */
function calculateBazi(year, month, day, hour, minute) {
  minute = minute || 0;

  const lunarInfo = calendar.solar2lunar(year, month, day);
  if (lunarInfo === -1) {
    return { success: false, error: '日期参数无效或超出支持范围（1900-3000）' };
  }

  try {
    const yearPillar  = computeYearPillar(year, month, day, hour, minute);
    const monthPillar = computeMonthPillar(year, month, day, hour, minute, yearPillar);
    const dayGanZhi   = lunarInfo.gzDay;
    const hourGanZhi  = calculateHourGanZhi(dayGanZhi, hour);

    return {
      success: true,
      baziData: {
        year: {
          gan: yearPillar.gan,
          zhi: yearPillar.zhi,
          ganzhiIndex: getGanZhiIndex(yearPillar.gan, yearPillar.zhi)
        },
        month: {
          gan: monthPillar.gan,
          zhi: monthPillar.zhi,
          ganzhiIndex: getGanZhiIndex(monthPillar.gan, monthPillar.zhi)
        },
        day: {
          gan: dayGanZhi[0],
          zhi: dayGanZhi[1],
          ganzhiIndex: getGanZhiIndex(dayGanZhi[0], dayGanZhi[1])
        },
        hour: {
          gan: hourGanZhi[0],
          zhi: hourGanZhi[1],
          ganzhiIndex: getGanZhiIndex(hourGanZhi[0], hourGanZhi[1])
        },
        lunarDate: {
          year:    lunarInfo.lYear,
          month:   lunarInfo.lMonth,
          day:     lunarInfo.lDay,
          isLeap:  lunarInfo.isLeap
        }
      },
      details: {
        solarDate: { year, month, day, hour, minute }
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { calculateBazi };
