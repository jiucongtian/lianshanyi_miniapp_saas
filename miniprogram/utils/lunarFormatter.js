/**
 * 农历时间格式化工具
 * 提供农历月份和日期的传统中文显示
 */

// 农历月份映射
const LUNAR_MONTHS = [
  null,
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
];

// 农历日期映射
const LUNAR_DAYS = [
  null,
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

/**
 * 获取农历月份的中文名称
 * @param {number} month - 月份数值 (1-12)
 * @returns {string} 农历月份中文名称
 */
function getLunarMonthName(month) {
  if (month < 1 || month > 12) {
    console.warn('[lunarFormatter] 无效的月份值:', month);
    return `${month}月`;
  }
  return LUNAR_MONTHS[month];
}

/**
 * 获取农历日期的中文名称
 * @param {number} day - 日期数值 (1-30)
 * @returns {string} 农历日期中文名称
 */
function getLunarDayName(day) {
  if (day < 1 || day > 30) {
    console.warn('[lunarFormatter] 无效的日期值:', day);
    return `${day}日`;
  }
  return LUNAR_DAYS[day];
}

/**
 * 格式化农历时间显示
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {number} day - 日期 (1-30)
 * @param {string} timeName - 时辰名称（如"子时(23-01)"）
 * @param {boolean} isLeapMonth - 是否闰月
 * @returns {string} 格式化后的农历时间字符串
 */
function formatLunarDateTime(year, month, day, timeName = '', isLeapMonth = false) {
  const monthName = getLunarMonthName(month);
  const dayName = getLunarDayName(day);
  const leapPrefix = isLeapMonth ? '闰' : '';
  
  if (timeName) {
    return `${year}年${leapPrefix}${monthName}${dayName} ${timeName}`;
  } else {
    return `${year}年${leapPrefix}${monthName}${dayName}`;
  }
}

/**
 * 格式化农历时间显示（不包含时辰）
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {number} day - 日期 (1-30)
 * @param {boolean} isLeapMonth - 是否闰月
 * @returns {string} 格式化后的农历日期字符串
 */
function formatLunarDate(year, month, day, isLeapMonth = false) {
  const monthName = getLunarMonthName(month);
  const dayName = getLunarDayName(day);
  const leapPrefix = isLeapMonth ? '闰' : '';
  
  return `${year}年${leapPrefix}${monthName}${dayName}`;
}

module.exports = {
  LUNAR_MONTHS,
  LUNAR_DAYS,
  getLunarMonthName,
  getLunarDayName,
  formatLunarDateTime,
  formatLunarDate
};

