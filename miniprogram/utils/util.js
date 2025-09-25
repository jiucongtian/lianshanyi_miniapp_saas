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
  const minute = birthDate.minute || 0;
  const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
  return `${birthDate.year}年${birthDate.month}月${birthDate.day}日 ${birthDate.hour}:${minuteStr}`;
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
    baziData: {
      yearPillar: {
        heavenlyStem: profileData.baziData.year.gan,
        earthlyBranch: profileData.baziData.year.zhi
      },
      monthPillar: {
        heavenlyStem: profileData.baziData.month.gan,
        earthlyBranch: profileData.baziData.month.zhi
      },
      dayPillar: {
        heavenlyStem: profileData.baziData.day.gan,
        earthlyBranch: profileData.baziData.day.zhi
      },
      timePillar: {
        heavenlyStem: profileData.baziData.hour.gan,
        earthlyBranch: profileData.baziData.hour.zhi
      }
    }
  };
};

module.exports = {
  formatTime,
  formatDateTime,
  formatBirthTime,
  formatLunarTime,
  convertProfileToCardData,
  extractTimeParams,
  getLocalUrl,
};
