/**
 * 验证节气压缩数据的正确性
 */

const { sTermInfo } = require('./solar-terms-compressed.js');

/**
 * 将分钟数转换为日期时间
 * @param {number} minutes - 从年初开始的总分钟数
 * @param {number} year - 年份
 * @returns {Object} 包含月、日、时、分的对象
 */
function minutesToDateTime(minutes, year) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // 检查是否为闰年
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (isLeapYear) {
    daysInMonth[1] = 29;
  }
  
  const totalDays = Math.floor(minutes / (24 * 60));
  const remainingMinutes = minutes % (24 * 60);
  const hour = Math.floor(remainingMinutes / 60);
  const minute = remainingMinutes % 60;
  
  let month = 1;
  let day = totalDays + 1;
  
  for (let i = 0; i < 12; i++) {
    if (day <= daysInMonth[i]) {
      month = i + 1;
      break;
    }
    day -= daysInMonth[i];
  }
  
  return { month, day, hour, minute };
}

/**
 * 解析压缩的节气数据
 * @param {string} yearData - 年份的压缩数据
 * @param {number} year - 年份
 * @returns {Array} 24个节气的日期时间数组
 */
function parseYearData(yearData, year) {
  const terms = [];
  
  for (let i = 0; i < 24; i++) {
    const start = i * 5;
    const end = start + 5;
    const hexStr = yearData.substring(start, end);
    const minutes = parseInt(hexStr, 16);
    const dateTime = minutesToDateTime(minutes, year);
    terms.push(dateTime);
  }
  
  return terms;
}

/**
 * 验证指定年份的节气数据
 * @param {number} year - 年份
 */
function verifyYear(year) {
  const yearIndex = year - 1583;
  
  if (yearIndex < 0 || yearIndex >= sTermInfo.length) {
    console.log(`年份 ${year} 超出范围`);
    return;
  }
  
  const yearData = sTermInfo[yearIndex];
  const terms = parseYearData(yearData, year);
  
  const termNames = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
    '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
    '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
  ];
  
  console.log(`\n${year}年节气数据：`);
  terms.forEach((term, index) => {
    const { month, day, hour, minute } = term;
    console.log(`${termNames[index]}: ${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  });
}

// 验证几个年份的数据
console.log('验证节气压缩数据：');

// 验证1583年（第一年）
verifyYear(1583);

// 验证2000年
verifyYear(2000);

// 验证2024年
verifyYear(2024);

// 验证最后一年
verifyYear(2135);

console.log('\n压缩表统计：');
console.log(`总年份数：${sTermInfo.length}`);
console.log(`年份范围：1583-${1583 + sTermInfo.length - 1}`);
console.log(`数据大小：${sTermInfo.join('').length} 字符`);
