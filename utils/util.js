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

module.exports = {
  formatTime,
  formatDateTime,
  extractTimeParams,
  getLocalUrl,
};
