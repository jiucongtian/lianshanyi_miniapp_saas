const calendar = require('./js-calendar-converter.js');

const formatNumber = (n) => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

const formatTime = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`;
};

// 复制到本地临时路径，方便预览
const getLocalUrl = (path, name) => {
  const fs = wx.getFileSystemManager();
  const tempFileName = `${wx.env.USER_DATA_PATH}/${name}`;
  fs.copyFileSync(path, tempFileName);
  return tempFileName;
};

/**
 * 从时间戳提取时间参数
 * @param {number} timestamp - 时间戳
 * @returns {Object} 包含年月日时分的对象
 */
const extractTimeParams = (timestamp) => {
  const date = new Date(timestamp);
  
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // JavaScript月份从0开始，需要+1
    day: date.getDate(),
    hour: date.getHours(),
    min: date.getMinutes()
  };
};

/**
 * 格式化时间显示
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化的时间字符串
 */
const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  return `${year}年${month}月${day}日 ${formatNumber(hour)}:${formatNumber(minute)}`;
};

/**
 * 格式化生日时间（用于卡牌页面）
 * @param {Object} birthDate - 生日对象 {year, month, day, hour, minute}
 * @returns {string} 格式化的生日时间字符串
 */
const formatBirthTime = (birthDate) => {
  if (!birthDate || !birthDate.year) {
    return '未知';
  }
  
  const { year, month, day, hour, minute } = birthDate;
  const minuteStr = `:${minute.toString().padStart(2, '0')}`;
  const hourStr = ` ${hour.toString().padStart(2, '0')}${minuteStr}`;
  
  return `${year}年${month}月${day}日${hourStr}`;
};

/**
 * 格式化农历时间（用于卡牌页面）
 * @param {Object} lunarDate - 农历对象 {year, month, day, isLeap}
 * @returns {string} 格式化的农历时间字符串
 */
const formatLunarTime = (lunarDate) => {
  if (!lunarDate) return '';
  return `农历${lunarDate.year}年${lunarDate.month}月${lunarDate.day}日${lunarDate.isLeap ? '(闰月)' : ''}`;
};

/**
 * 将档案数据转换为卡牌数据格式
 * @param {Object} profileData - 档案数据
 * @returns {Object} 卡牌数据格式
 */
const convertProfileToCardData = (profileData) => {
  return {
    profileId: profileData._id,
    profileName: profileData.profileName,
    originalTime: formatBirthTime(profileData.birthDate),
    lunarTime: profileData.baziData.lunarDate ? formatLunarTime(profileData.baziData.lunarDate) : '',
    isUncertainTime: profileData.isUncertainTime || false,
    baziData: convertProfileBaziToCardFormat(profileData.baziData) // 转换为卡牌显示格式
  };
};

/**
 * 将档案格式的八字数据转换为卡牌显示格式
 * @param {Object} profileBaziData - 档案格式的八字数据 {year: {gan, zhi, ganzhiIndex}, ...}
 * @returns {Object} 卡牌显示格式的八字数据 {yearPillar: {heavenlyStem, earthlyBranch}, ...}
 */
function convertProfileBaziToCardFormat(profileBaziData) {
  return {
    yearPillar: {
      heavenlyStem: profileBaziData.year.gan,
      earthlyBranch: profileBaziData.year.zhi
    },
    monthPillar: {
      heavenlyStem: profileBaziData.month.gan,
      earthlyBranch: profileBaziData.month.zhi
    },
    dayPillar: {
      heavenlyStem: profileBaziData.day.gan,
      earthlyBranch: profileBaziData.day.zhi
    },
    timePillar: {
      heavenlyStem: profileBaziData.hour.gan,
      earthlyBranch: profileBaziData.hour.zhi
    }
  };
}

/**
 * 将公历时间转换为农历时间
 * @param {Object} solarDateTime - 公历时间对象 {year, month, day, hour, minute}
 * @returns {Object|null} 农历时间对象 {year, month, day, hour, minute, isLeapMonth} 或 null
 */
const convertSolarToLunar = (solarDateTime) => {
  if (!solarDateTime || !solarDateTime.year || !solarDateTime.month || !solarDateTime.day) {
    return null;
  }

  try {
    const lunarResult = calendar.solar2lunar(
      solarDateTime.year,
      solarDateTime.month,
      solarDateTime.day
    );

    if (lunarResult === -1) {
      console.error('[convertSolarToLunar] 公历日期无效:', solarDateTime);
      return null;
    }

    return {
      year: lunarResult.lYear,
      month: lunarResult.lMonth,
      day: lunarResult.lDay,
      hour: solarDateTime.hour || 0,
      minute: solarDateTime.minute || 0,
      isLeapMonth: lunarResult.isLeap
    };
  } catch (error) {
    console.error('[convertSolarToLunar] 转换失败:', error);
    return null;
  }
};

/**
 * 将农历时间转换为公历时间
 * @param {Object} lunarDateTime - 农历时间对象 {year, month, day, hour, minute, isLeapMonth}
 * @returns {Object|null} 公历时间对象 {year, month, day, hour, minute} 或 null
 */
const convertLunarToSolar = (lunarDateTime) => {
  if (!lunarDateTime || !lunarDateTime.year || !lunarDateTime.month || !lunarDateTime.day) {
    return null;
  }

  try {
    const solarResult = calendar.lunar2solar(
      lunarDateTime.year,
      lunarDateTime.month,
      lunarDateTime.day,
      lunarDateTime.isLeapMonth || false
    );

    if (solarResult === -1) {
      console.error('[convertLunarToSolar] 农历日期无效:', lunarDateTime);
      return null;
    }

    return {
      year: solarResult.cYear,
      month: solarResult.cMonth,
      day: solarResult.cDay,
      hour: lunarDateTime.hour || 0,
      minute: lunarDateTime.minute || 0
    };
  } catch (error) {
    console.error('[convertLunarToSolar] 转换失败:', error);
    return null;
  }
};

/**
 * 格式化农历时间显示
 * @param {Object} solarDateTime - 公历时间对象 {year, month, day, hour, minute}
 * @returns {string} 格式化后的农历时间字符串
 */
const formatLunarDateTime = (solarDateTime) => {
  const lunarDateTime = convertSolarToLunar(solarDateTime);
  if (!lunarDateTime) {
    return '';
  }

  const { year, month, day, hour, minute } = lunarDateTime;
  
  // 获取时辰名称
  const timeName = getTimeNameByHour(hour);
  
  // 构建农历时间字符串
  let lunarTimeStr = `${year}年${month}月${day}日 ${timeName}`;
  
  // 如果是闰月，添加闰月标识
  if (lunarDateTime.isLeapMonth) {
    lunarTimeStr = `${year}年闰${month}月${day}日 ${timeName}`;
  }
  
  return lunarTimeStr;
};

/**
 * 根据小时获取时辰名称
 * @param {number} hour - 小时
 * @returns {string} 时辰名称
 */
const getTimeNameByHour = (hour) => {
  const timeMapObjects = [
    { name: '子时', start: 23, end: 1 },
    { name: '丑时', start: 1, end: 3 },
    { name: '寅时', start: 3, end: 5 },
    { name: '卯时', start: 5, end: 7 },
    { name: '辰时', start: 7, end: 9 },
    { name: '巳时', start: 9, end: 11 },
    { name: '午时', start: 11, end: 13 },
    { name: '未时', start: 13, end: 15 },
    { name: '申时', start: 15, end: 17 },
    { name: '酉时', start: 17, end: 19 },
    { name: '戌时', start: 19, end: 21 },
    { name: '亥时', start: 21, end: 23 }
  ];
  
  for (const time of timeMapObjects) {
    if (time.name === '子时') {
      if (hour >= 23 || hour < 1) {
        return time.name;
      }
    } else if (hour >= time.start && hour < time.end) {
      return time.name;
    }
  }
  return '子时';
};

module.exports = {
  formatTime,
  formatDateTime,
  formatBirthTime,
  formatLunarTime,
  convertProfileToCardData,
  convertProfileBaziToCardFormat,
  extractTimeParams,
  getLocalUrl,
  convertSolarToLunar,
  convertLunarToSolar,
  formatLunarDateTime,
};
