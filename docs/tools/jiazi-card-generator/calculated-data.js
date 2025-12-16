/**
 * 组合计算模块
 * 根据天干地支的五行属性等计算季节标记、爻位等
 */

const { getGanWuxing, getZhiWuxing } = require('./base-data');

// 五行对应的季节（保留用于其他用途）
const WUXING_SEASON = {
  '木': '春',
  '火': '夏',
  '土': '长夏',  // 土对应长夏，但显示时可能简化为"夏"
  '金': '秋',
  '水': '冬'
};

// 天干对应的季节
// 规则：甲、乙→春，丙、丁→夏，戊、己→夏，庚、辛→秋，壬、癸→冬
const GAN_SEASON = {
  '甲': '春',
  '乙': '春',
  '丙': '夏',
  '丁': '夏',
  '戊': '夏',
  '己': '夏',
  '庚': '秋',
  '辛': '秋',
  '壬': '冬',
  '癸': '冬'
};

// 地支对应的季节
const ZHI_SEASON = {
  '子': '冬',
  '丑': '冬',
  '寅': '春',
  '卯': '春',
  '辰': '春',
  '巳': '夏',
  '午': '夏',
  '未': '夏',
  '申': '秋',
  '酉': '秋',
  '戌': '秋',
  '亥': '冬'
};

// 爻位映射表（abilityMark对应的爻位信息）
// 从数据中看到abilityMark有：1、2、3、4、5、6
// 需要根据实际数据建立完整映射
const YAO_POSITION_MAP = {
  '1': { name: '初爻', description: '低位', trait: '先锋' },
  '2': { name: '二爻', description: '低位', trait: '规矩执行' },
  '3': { name: '三爻', description: '中位', trait: '链接' },
  '4': { name: '四爻', description: '中位', trait: '统筹' },
  '5': { name: '五爻', description: '高位', trait: '决策' },
  '6': { name: '上爻', description: '高位', trait: '终局' }
};

/**
 * 计算季节标记
 * 根据天干和地支的季节组合
 * 天干：甲、乙→春，丙、丁→夏，戊、己、庚、辛→秋，壬、癸→冬
 * 地支：子、丑、亥→冬，寅、卯、辰→春，巳、午、未→夏，申、酉、戌→秋
 * @param {string} gan - 天干
 * @param {string} zhi - 地支
 * @returns {string} 季节标记，如"春冬"、"夏春"等
 */
function calculateSeasonMark(gan, zhi) {
  const ganSeason = GAN_SEASON[gan];
  const zhiSeason = ZHI_SEASON[zhi];
  
  if (!ganSeason || !zhiSeason) return '';
  
  // 组合天干和地支的季节
  return ganSeason + zhiSeason;
}

/**
 * 获取爻位信息
 * @param {string} abilityMark - 能力标记（1-6）
 * @returns {Object|null} 爻位信息 {name, description, trait}
 */
function getYaoInfo(abilityMark) {
  return YAO_POSITION_MAP[abilityMark] || null;
}

/**
 * 计算五行相生相克关系
 * @param {string} wuxing1 - 五行1
 * @param {string} wuxing2 - 五行2
 * @returns {string} 关系：'相生'、'相克'、'相同'
 */
function calculateWuxingRelation(wuxing1, wuxing2) {
  if (wuxing1 === wuxing2) return '相同';
  
  // 五行相生：木生火、火生土、土生金、金生水、水生木
  const shengMap = {
    '木': '火',
    '火': '土',
    '土': '金',
    '金': '水',
    '水': '木'
  };
  
  // 五行相克：木克土、土克水、水克火、火克金、金克木
  const keMap = {
    '木': '土',
    '土': '水',
    '水': '火',
    '火': '金',
    '金': '木'
  };
  
  if (shengMap[wuxing1] === wuxing2) {
    return '相生';
  } else if (keMap[wuxing1] === wuxing2) {
    return '相克';
  } else if (shengMap[wuxing2] === wuxing1) {
    return '被生';
  } else if (keMap[wuxing2] === wuxing1) {
    return '被克';
  }
  
  return '无关';
}

module.exports = {
  WUXING_SEASON,
  GAN_SEASON,
  ZHI_SEASON,
  YAO_POSITION_MAP,
  calculateSeasonMark,
  getYaoInfo,
  calculateWuxingRelation
};

