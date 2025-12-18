/**
 * 基础数据查表模块
 * 包含天干地支、五行、生肖等基础数据
 */

// 天干数组
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 地支数组
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 生肖数组（对应地支）
const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// 天干五行映射
const GAN_WUXING = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

// 地支五行映射
const ZHI_WUXING = {
  '子': '水', '亥': '水',
  '寅': '木', '卯': '木',
  '巳': '火', '午': '火',
  '申': '金', '酉': '金',
  '辰': '土', '戌': '土', '丑': '土', '未': '土'
};

// 60甲子名称到编号映射
const CARD_NAME_TO_NUMBER = {
  "甲子": 1, "乙丑": 2, "丙寅": 3, "丁卯": 4, "戊辰": 5, "己巳": 6,
  "庚午": 7, "辛未": 8, "壬申": 9, "癸酉": 10, "甲戌": 11, "乙亥": 12,
  "丙子": 13, "丁丑": 14, "戊寅": 15, "己卯": 16, "庚辰": 17, "辛巳": 18,
  "壬午": 19, "癸未": 20, "甲申": 21, "乙酉": 22, "丙戌": 23, "丁亥": 24,
  "戊子": 25, "己丑": 26, "庚寅": 27, "辛卯": 28, "壬辰": 29, "癸巳": 30,
  "甲午": 31, "乙未": 32, "丙申": 33, "丁酉": 34, "戊戌": 35, "己亥": 36,
  "庚子": 37, "辛丑": 38, "壬寅": 39, "癸卯": 40, "甲辰": 41, "乙巳": 42,
  "丙午": 43, "丁未": 44, "戊申": 45, "己酉": 46, "庚戌": 47, "辛亥": 48,
  "壬子": 49, "癸丑": 50, "甲寅": 51, "乙卯": 52, "丙辰": 53, "丁巳": 54,
  "戊午": 55, "己未": 56, "庚申": 57, "辛酉": 58, "壬戌": 59, "癸亥": 60
};

/**
 * 获取天干五行
 * @param {string} gan - 天干
 * @returns {string} 五行
 */
function getGanWuxing(gan) {
  return GAN_WUXING[gan] || null;
}

/**
 * 获取地支五行
 * @param {string} zhi - 地支
 * @returns {string} 五行
 */
function getZhiWuxing(zhi) {
  return ZHI_WUXING[zhi] || null;
}

/**
 * 获取生肖
 * @param {string} zhi - 地支
 * @returns {string} 生肖
 */
function getAnimal(zhi) {
  const index = ZHI.indexOf(zhi);
  return index >= 0 ? ANIMALS[index] : null;
}

/**
 * 获取干支编号
 * @param {string} ganZhi - 干支名称
 * @returns {number} 编号（1-60）
 */
function getCardNumber(ganZhi) {
  return CARD_NAME_TO_NUMBER[ganZhi] || null;
}

/**
 * 根据编号获取干支名称
 * @param {number} cardNumber - 编号（1-60）
 * @returns {string} 干支名称
 */
function getGanZhiByNumber(cardNumber) {
  if (cardNumber < 1 || cardNumber > 60) return null;
  
  const ganIndex = (cardNumber - 1) % 10;
  const zhiIndex = (cardNumber - 1) % 12;
  
  return GAN[ganIndex] + ZHI[zhiIndex];
}

module.exports = {
  GAN,
  ZHI,
  ANIMALS,
  GAN_WUXING,
  ZHI_WUXING,
  CARD_NAME_TO_NUMBER,
  getGanWuxing,
  getZhiWuxing,
  getAnimal,
  getCardNumber,
  getGanZhiByNumber
};

