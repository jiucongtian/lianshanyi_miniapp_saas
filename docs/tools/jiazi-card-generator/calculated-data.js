/**
 * 组合计算模块
 * 根据天干地支的五行属性等计算季节标记、爻位等
 */

const { getGanWuxing, getZhiWuxing } = require('./base-data');

// 五行对应的季节
const WUXING_SEASON = {
  '木': '春',
  '火': '夏',
  '土': '长夏',  // 土对应长夏，但显示时可能简化为"夏"
  '金': '秋',
  '水': '冬'
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
 * 根据天干和地支的五行属性组合
 * @param {string} gan - 天干
 * @param {string} zhi - 地支
 * @returns {string} 季节标记，如"春冬"、"夏春"等
 */
function calculateSeasonMark(gan, zhi) {
  const ganWuxing = getGanWuxing(gan);
  const zhiWuxing = getZhiWuxing(zhi);
  
  if (!ganWuxing || !zhiWuxing) return '';
  
  const ganSeason = WUXING_SEASON[ganWuxing];
  const zhiSeason = WUXING_SEASON[zhiWuxing];
  
  // 如果天干和地支的五行相同，显示为"春春"、"夏夏"等
  if (ganSeason === zhiSeason) {
    return ganSeason + ganSeason;
  }
  
  // 如果不同，组合显示，如"春冬"、"夏春"等
  // 注意：可能需要根据实际数据调整顺序
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
  YAO_POSITION_MAP,
  calculateSeasonMark,
  getYaoInfo,
  calculateWuxingRelation
};

