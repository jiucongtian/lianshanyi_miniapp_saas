/**
 * 生辰八字计算器
 * 根据指定的公历日期和时间计算生辰八字（年柱、月柱、日柱、时柱）
 * 
 * @author 自动生成
 * @date 2025-10-16
 */

const calendar = require('./core-converter/js-calendar-converter.cjs');
const solarTerms = require('./core-converter/solar-terms-compressed-original.js');

/**
 * 计算生辰八字
 * @param {number} year - 公历年份
 * @param {number} month - 公历月份（1-12）
 * @param {number} day - 公历日期（1-31）
 * @param {number} hour - 小时（0-23）
 * @param {number} minute - 分钟（0-59），可选，默认为0
 * @returns {Object} 返回包含完整八字信息的对象
 */
function calculateBazi(year, month, day, hour = 0, minute = 0) {
  // 1. 使用 js-calendar-converter 获取基础干支信息
  const lunarInfo = calendar.solar2lunar(year, month, day);
  
  if (lunarInfo === -1) {
    return {
      success: false,
      error: '日期参数无效或超出支持范围（1900-2100）'
    };
  }

  // 2. 获取基础干支信息
  let yearGanZhi = lunarInfo.gzYear;   // 年柱
  let monthGanZhi = lunarInfo.gzMonth; // 月柱
  const dayGanZhi = lunarInfo.gzDay;   // 日柱

  // 创建当前时间对象（用于年柱和月柱修正）
  const currentTime = new Date(year, month - 1, day, hour, minute);

  // 3. 修正年柱：检查是否早于立春（使用时辰区间判断）
  const lichunTime = solarTerms.getSolarTermTime(year, '立春');
  let yearCorrected = false;
  
  if (lichunTime) {
    // 检查立春是否在当天
    const lichunDate = lichunTime.getDate();
    const lichunMonth = lichunTime.getMonth() + 1;
    
    if (lichunDate === day && lichunMonth === month) {
      // 立春在当天，使用时辰区间判断
      const timeRange = getHourRange(year, month, day, hour);
      
      // 只有整个时辰都在立春前，才使用前一年的年柱
      if (lichunTime >= timeRange.end) {
        const prevYearLunar = calendar.solar2lunar(year - 1, 12, 31);
        if (prevYearLunar !== -1) {
          yearGanZhi = prevYearLunar.gzYear;
          yearCorrected = true;
        }
      }
    } else if (currentTime < lichunTime) {
      // 立春不在当天，且当前时间早于立春（不同日期）
      const prevYearLunar = calendar.solar2lunar(year - 1, 12, 31);
      if (prevYearLunar !== -1) {
        yearGanZhi = prevYearLunar.gzYear;
        yearCorrected = true;
      }
    }
  }

  // 4. 修正月柱：检查是否是当月第一个节气日，且时间早于节气时刻
  const needMonthCorrection = checkMonthCorrection(year, month, day, hour, minute);
  if (needMonthCorrection.needCorrect) {
    // 使用节气前一天的日期来获取正确的月柱
    // 这样可以避免跨月时的问题
    const solarTermDate = needMonthCorrection.solarTermInfo.date;
    let prevYear = solarTermDate.year;
    let prevMonth = solarTermDate.month;
    let prevDay = solarTermDate.day - 1;
    
    // 处理跨月的情况
    if (prevDay < 1) {
      if (prevMonth === 1) {
        prevYear -= 1;
        prevMonth = 12;
        prevDay = 31;
      } else {
        prevMonth -= 1;
        const maxDay = calendar.solarDays(prevYear, prevMonth);
        prevDay = maxDay;
      }
    }
    
    const prevMonthLunar = calendar.solar2lunar(prevYear, prevMonth, prevDay);
    if (prevMonthLunar !== -1) {
      monthGanZhi = prevMonthLunar.gzMonth;
    }
  }

  // 5. 计算时柱
  const hourGanZhi = calculateHourGanZhi(dayGanZhi, hour);

  // 6. 返回完整的八字信息
  return {
    success: true,
    bazi: {
      year: yearGanZhi,    // 年柱
      month: monthGanZhi,  // 月柱
      day: dayGanZhi,      // 日柱
      hour: hourGanZhi     // 时柱
    },
    details: {
      solarDate: {
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute
      },
      lunarDate: {
        year: lunarInfo.lYear,
        month: lunarInfo.lMonth,
        day: lunarInfo.lDay,
        isLeap: lunarInfo.isLeap
      },
      corrections: {
        yearCorrected: yearCorrected,
        monthCorrected: needMonthCorrection.needCorrect,
        lichunTime: lichunTime ? formatDateTime(lichunTime) : null,
        solarTermInfo: needMonthCorrection.solarTermInfo
      }
    }
  };
}

/**
 * 检查是否需要修正月柱
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @param {number} day - 日期
 * @param {number} hour - 小时
 * @param {number} minute - 分钟
 * @returns {Object} 包含是否需要修正和节气信息的对象
 */
function checkMonthCorrection(year, month, day, hour, minute) {
  // 每个月的第一个节气（节）的索引
  // 索引规律：(month - 1) * 2
  // 1月-小寒(0), 2月-立春(2), 3月-惊蛰(4), 4月-清明(6), 
  // 5月-立夏(8), 6月-芒种(10), 7月-小暑(12), 8月-立秋(14),
  // 9月-白露(16), 10月-寒露(18), 11月-立冬(20), 12月-大雪(22)
  
  const solarTermIndex = (month - 1) * 2;
  const solarTermTime = solarTerms.getSolarTermTime(year, solarTermIndex);
  
  if (!solarTermTime) {
    return {
      needCorrect: false,
      solarTermInfo: null
    };
  }

  // 检查当天是否是节气日
  const solarTermDate = solarTermTime.getDate();
  const solarTermMonth = solarTermTime.getMonth() + 1;

  // 如果是节气当天（月份和日期都要匹配）
  if (solarTermDate === day && solarTermMonth === month) {
    // 计算时辰区间
    const timeRange = getHourRange(year, month, day, hour);
    
    // 判断节气时间与时辰区间的关系
    let needCorrect = false;
    let beforeSolarTerm = false;
    
    if (solarTermTime < timeRange.start) {
      // 节气时间早于时辰区间开始 → 整个时辰都在节气之后
      needCorrect = false;
      beforeSolarTerm = false;
    } else if (solarTermTime >= timeRange.end) {
      // 节气时间晚于或等于时辰区间结束 → 整个时辰都在节气之前
      needCorrect = true;
      beforeSolarTerm = true;
    } else {
      // 节气时间在时辰区间内 → 视为在节气之后
      needCorrect = false;
      beforeSolarTerm = false;
    }
    
    return {
      needCorrect: needCorrect,
      solarTermInfo: {
        name: solarTerms.getSolarTermName(solarTermIndex),
        time: formatDateTime(solarTermTime),
        timeRange: {
          start: formatDateTime(timeRange.start),
          end: formatDateTime(timeRange.end)
        },
        isSolarTermDay: true,
        beforeSolarTerm: beforeSolarTerm,
        date: {
          year: year,
          month: solarTermMonth,
          day: solarTermDate
        }
      }
    };
  }

  return {
    needCorrect: false,
    solarTermInfo: null
  };
}

/**
 * 获取指定小时所属时辰的时间区间
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @param {number} day - 日期
 * @param {number} hour - 小时（0-23）
 * @returns {Object} 包含start和end的时间区间对象
 */
function getHourRange(year, month, day, hour) {
  // 时辰划分：
  // 子时 23:00-00:59（跨日）
  // 丑时 01:00-02:59
  // 寅时 03:00-04:59
  // ... 依此类推
  // 亥时 21:00-22:59
  
  let startHour, endHour;
  let startDay = day, endDay = day;
  let startMonth = month, endMonth = month;
  let startYear = year, endYear = year;
  
  if (hour === 23) {
    // 子时：23:00-00:59（跨日到次日）
    startHour = 23;
    endHour = 0;
    endDay = day + 1;
    
    // 处理跨月
    const maxDay = calendar.solarDays(year, month);
    if (endDay > maxDay) {
      endDay = 1;
      endMonth = month + 1;
      if (endMonth > 12) {
        endMonth = 1;
        endYear = year + 1;
      }
    }
  } else if (hour === 0) {
    // 子时：前一天23:00-当天00:59
    startHour = 23;
    endHour = 0;
    startDay = day - 1;
    
    // 处理跨月
    if (startDay < 1) {
      startMonth = month - 1;
      if (startMonth < 1) {
        startMonth = 12;
        startYear = year - 1;
      }
      startDay = calendar.solarDays(startYear, startMonth);
    }
  } else {
    // 其他时辰：每两个小时一个时辰
    // 丑(1-2), 寅(3-4), 卯(5-6), 辰(7-8), 巳(9-10), 午(11-12),
    // 未(13-14), 申(15-16), 酉(17-18), 戌(19-20), 亥(21-22)
    startHour = hour % 2 === 1 ? hour : hour - 1;
    endHour = startHour + 1;
  }
  
  // 创建时间区间
  const start = new Date(startYear, startMonth - 1, startDay, startHour, 0, 0);
  const end = new Date(endYear, endMonth - 1, endDay, endHour, 59, 59);
  
  return { start, end };
}

/**
 * 获取上一个月的日期
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @param {number} day - 日期
 * @returns {Object} 上一个月的年月日
 */
function getPreviousMonth(year, month, day) {
  if (month === 1) {
    // 如果是1月，回到去年12月
    return {
      year: year - 1,
      month: 12,
      day: Math.min(day, 31) // 12月有31天
    };
  } else {
    // 其他月份，月份减1
    const prevMonth = month - 1;
    // 获取上个月的最大天数
    const maxDay = calendar.solarDays(year, prevMonth);
    return {
      year: year,
      month: prevMonth,
      day: Math.min(day, maxDay)
    };
  }
}

/**
 * 计算时柱
 * 时辰对照：
 * 子时 23:00-00:59
 * 丑时 01:00-02:59
 * 寅时 03:00-04:59
 * 卯时 05:00-06:59
 * 辰时 07:00-08:59
 * 巳时 09:00-10:59
 * 午时 11:00-12:59
 * 未时 13:00-14:59
 * 申时 15:00-16:59
 * 酉时 17:00-18:59
 * 戌时 19:00-20:59
 * 亥时 21:00-22:59
 * 
 * @param {string} dayGanZhi - 日柱干支
 * @param {number} hour - 小时（0-23）
 * @returns {string} 时柱干支
 */
function calculateHourGanZhi(dayGanZhi, hour) {
  const Gan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const Zhi = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

  // 根据小时确定地支
  let zhiIndex;
  if (hour >= 23 || hour < 1) {
    zhiIndex = 0; // 子时
  } else {
    zhiIndex = Math.floor((hour + 1) / 2);
  }

  // 根据日干推算时干（日干起时法）
  // 甲己日：甲子时开始
  // 乙庚日：丙子时开始
  // 丙辛日：戊子时开始
  // 丁壬日：庚子时开始
  // 戊癸日：壬子时开始
  const dayGan = dayGanZhi.charAt(0);
  const dayGanIndex = Gan.indexOf(dayGan);
  
  // 子时的天干起点
  const hourGanStart = {
    0: 0,  // 甲
    5: 0,  // 己
    1: 2,  // 乙->丙
    6: 2,  // 庚->丙
    2: 4,  // 丙->戊
    7: 4,  // 辛->戊
    3: 6,  // 丁->庚
    8: 6,  // 壬->庚
    4: 8,  // 戊->壬
    9: 8   // 癸->壬
  };

  const ganStart = hourGanStart[dayGanIndex];
  const ganIndex = (ganStart + zhiIndex * 2) % 10;

  return Gan[ganIndex] + Zhi[zhiIndex];
}

/**
 * 格式化日期时间
 * @param {Date} date - 日期对象
 * @returns {string} 格式化的日期时间字符串
 */
function formatDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hour}时${minute}分`;
}

module.exports = {
  calculateBazi
};

