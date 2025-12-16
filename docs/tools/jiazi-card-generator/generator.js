/**
 * 六十甲子卡牌数据生成器
 * 整合所有模块，生成完整的卡牌数据
 */

const baseData = require('./base-data');
const businessData = require('./business-data');
const calculatedData = require('./calculated-data');

/**
 * 生成密码/关键词
 * TODO: 密码生成逻辑待实现
 * @param {string} ganZhi - 干支名称
 * @param {Object} context - 上下文数据（可用于生成密码）
 * @returns {string} 密码
 */
function generatePassword(ganZhi, context = {}) {
  // TODO: 实现密码生成逻辑
  // 暂时返回空字符串
  return '';
}

/**
 * 生成单个卡牌数据
 * @param {string} ganZhi - 干支名称，如"甲子"
 * @param {Object} options - 可选参数
 * @param {string} options.central - 中心描述（如果提供则使用，否则需要从模板生成）
 * @param {string} options.blessing - 祝福语（如果提供则使用，否则需要从模板生成）
 * @param {string} options.tip - 提示语（如果提供则使用，否则需要从模板生成）
 * @param {string} options.password - 密码（如果提供则使用，否则通过生成器生成）
 * @returns {Object} 卡牌数据对象
 */
function generateCardData(ganZhi, options = {}) {
  const gan = ganZhi[0];
  const zhi = ganZhi[1];
  
  // 基础数据
  const cardNumber = baseData.getCardNumber(ganZhi);
  const ganWuxing = baseData.getGanWuxing(gan);
  const zhiWuxing = baseData.getZhiWuxing(zhi);
  const animal = baseData.getAnimal(zhi);
  
  // 业务数据
  const talentMark = businessData.getTalentMark(gan);
  const abilityMark = businessData.getAbilityMark(ganZhi);
  const pathMark = businessData.getPathMark(ganZhi);
  
  // 计算数据
  const seasonMark = calculatedData.calculateSeasonMark(gan, zhi);
  const wuxingRelation = calculatedData.calculateWuxingRelation(ganWuxing, zhiWuxing);
  const yaoInfo = calculatedData.getYaoInfo(abilityMark);
  
  // 生成密码（如果提供了则使用，否则通过生成器生成）
  const password = options.password !== undefined 
    ? options.password 
    : generatePassword(ganZhi, { gan, zhi, talentMark, abilityMark, pathMark, seasonMark });
  
  // 构建卡牌数据
  const cardData = {
    cardName: ganZhi,
    cardNumber: cardNumber,
    seasonMark: seasonMark,
    talentMark: talentMark,
    abilityMark: abilityMark,
    pathMark: pathMark,
    password: password,
    // 以下字段如果提供了则使用，否则需要从模板生成
    central: options.central || '',
    blessing: options.blessing || '',
    tip: options.tip || '',
    // 元数据
    createdAt: options.createdAt || new Date().toISOString(),
    updatedAt: options.updatedAt || new Date().toISOString(),
    isActive: options.isActive !== undefined ? options.isActive : true
  };
  
  // 如果需要生成_id，可以使用cardNumber生成
  if (options.generateId) {
    cardData._id = `card_${cardNumber}_${ganZhi}`;
  }
  
  return cardData;
}

/**
 * 生成所有60个卡牌数据
 * @param {Object} options - 可选参数
 * @param {Function} options.centralGenerator - 中心描述生成函数
 * @param {Function} options.blessingGenerator - 祝福语生成函数
 * @param {Function} options.tipGenerator - 提示语生成函数
 * @returns {Array} 卡牌数据数组
 */
function generateAllCards(options = {}) {
  const cards = [];
  
  for (let i = 1; i <= 60; i++) {
    const ganZhi = baseData.getGanZhiByNumber(i);
    
    // 获取自定义数据（如果有）
    const customData = options.customData && options.customData[ganZhi] ? options.customData[ganZhi] : {};
    
    // 生成卡牌数据
    const cardData = generateCardData(ganZhi, {
      central: customData.central || (options.centralGenerator ? options.centralGenerator(ganZhi, i) : ''),
      blessing: customData.blessing || (options.blessingGenerator ? options.blessingGenerator(ganZhi, i) : ''),
      tip: customData.tip || (options.tipGenerator ? options.tipGenerator(ganZhi, i) : ''),
      generateId: options.generateId !== false,
      ...customData
    });
    
    cards.push(cardData);
  }
  
  return cards;
}

/**
 * 从现有JSON数据中提取自定义数据
 * @param {Array} existingData - 现有卡牌数据数组
 * @returns {Object} 自定义数据映射 {ganZhi: {central, blessing, tip, ...}}
 */
function extractCustomData(existingData) {
  const customData = {};
  
  existingData.forEach(item => {
    customData[item.cardName] = {
      central: item.central,
      blessing: item.blessing,
      tip: item.tip,
      _id: item._id,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  });
  
  return customData;
}

module.exports = {
  generateCardData,
  generateAllCards,
  extractCustomData,
  generatePassword,
  // 导出子模块以便单独使用
  baseData,
  businessData,
  calculatedData
};

