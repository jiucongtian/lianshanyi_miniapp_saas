import { getSolarTerm } from './tempSolarTerms';

// 基础数据
const 天干 = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const 地支 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 月支对应表（节气起始）
const 节气月支表 = {
  '立春': '寅', '惊蛰': '寅',
  '春分': '卯', '清明': '卯',
  '立夏': '辰', '芒种': '辰',
  '夏至': '巳', '大暑': '巳',
  '立秋': '午', '白露': '午',
  '秋分': '未', '寒露': '未',
  '立冬': '申', '大雪': '申',
  '冬至': '丑', '小寒': '丑',
  '雨水': '寅', '谷雨': '卯',
  '小满': '辰', '小暑': '巳',
  '处暑': '午', '霜降': '未',
  '小雪': '申', '大寒': '丑'
};

// 时辰对应表
const 时辰表 = [
  { start: 23, end: 1, 支: '子' },
  { start: 1, end: 3, 支: '丑' },
  { start: 3, end: 5, 支: '寅' },
  { start: 5, end: 7, 支: '卯' },
  { start: 7, end: 9, 支: '辰' },
  { start: 9, end: 11, 支: '巳' },
  { start: 11, end: 13, 支: '午' },
  { start: 13, end: 15, 支: '未' },
  { start: 15, end: 17, 支: '申' },
  { start: 17, end: 19, 支: '酉' },
  { start: 19, end: 21, 支: '戌' },
  { start: 21, end: 23, 支: '亥' }
];

// 获取年柱
const getYearPillar = (date) => {
  const year = date.getFullYear();
  const yearGan = (year - 4) % 10;
  const yearZhi = (year - 4) % 12;

  return {
    heavenlyStem: 天干[yearGan],
    earthlyBranch: 地支[yearZhi]
  };
};

// 获取月柱
const getMonthPillar = (date, yearGan) => {
  const solarTerm = getSolarTerm(date);
  const monthZhi = 节气月支表[solarTerm.current.term];
  const zhiIndex = 地支.indexOf(monthZhi);
  
  // 月干公式：年干 × 2 + 月支索引 % 10
  const monthGan = (yearGan * 2 + zhiIndex) % 10;

  return {
    heavenlyStem: 天干[monthGan],
    earthlyBranch: monthZhi,
    nearChange: solarTerm.isNearChange
  };
};

// 获取日柱
const getDayPillar = (date) => {
  // 计算距离1900年1月31日甲辰日的天数
  const baseDate = new Date(1900, 0, 31);
  const days = Math.floor((date - baseDate) / (24 * 60 * 60 * 1000));
  
  const gan = days % 10;
  const zhi = days % 12;

  return {
    heavenlyStem: 天干[gan],
    earthlyBranch: 地支[zhi]
  };
};

// 获取时柱
const getTimePillar = (date, dayGan) => {
  const hour = date.getHours();
  const minutes = date.getMinutes();
  
  // 处理子时跨日的情况
  let timeZhi;
  if (hour === 23) {
    timeZhi = '子';
  } else if (hour === 0) {
    timeZhi = '子';
  } else {
    // 查找对应时辰
    const timeSlot = 时辰表.find(t => 
      (hour >= t.start && hour < t.end) || 
      (t.start === 23 && hour >= 23)
    );
    timeZhi = timeSlot.支;
  }

  // 计算时干
  const zhiIndex = 地支.indexOf(timeZhi);
  const dayGanIndex = 天干.indexOf(dayGan);
  const timeGan = (dayGanIndex * 2 + zhiIndex) % 10;

  return {
    heavenlyStem: 天干[timeGan],
    earthlyBranch: timeZhi,
    isZiTime: timeZhi === '子' // 标记是否为子时
  };
};

// 主计算函数
const calculateBazi = (date) => {
  // 验证日期范围
  const year = date.getFullYear();
  if (year < 1949 || year > 2050) {
    throw new Error('暂只支持1949年至2050年间的生辰八字查询');
  }

  // 计算年柱
  const yearPillar = getYearPillar(date);
  
  // 计算月柱
  const yearGanIndex = 天干.indexOf(yearPillar.heavenlyStem);
  const monthPillar = getMonthPillar(date, yearGanIndex);
  
  // 计算日柱
  const dayPillar = getDayPillar(date);
  
  // 计算时柱
  const timePillar = getTimePillar(date, dayPillar.heavenlyStem);

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    timePillar,
    warnings: {
      isNearSolarTerm: monthPillar.nearChange,
      isZiTime: timePillar.isZiTime
    }
  };
};

export { calculateBazi };
