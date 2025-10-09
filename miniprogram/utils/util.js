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

module.exports = {
  formatTime,
  formatDateTime,
  formatBirthTime,
  formatLunarTime,
  convertProfileToCardData,
  convertProfileBaziToCardFormat,
  extractTimeParams,
  getLocalUrl,
};
