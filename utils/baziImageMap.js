/**
 * 八字图片资源映射表
 * 包含60个甲子纪年的数字编号、拼音名称和图片资源路径
 */

// 生成八字图片映射表的函数 [[memory:7739041]]
const generateBaziImageMap = () => {
  const baziData = [
    { num: 1, pinyin: 'jiazi' },
    { num: 2, pinyin: 'yichou' },
    { num: 3, pinyin: 'bingyin' },
    { num: 4, pinyin: 'dingmao' },
    { num: 5, pinyin: 'wuchen' },
    { num: 6, pinyin: 'jisi' },
    { num: 7, pinyin: 'gengwu' },
    { num: 8, pinyin: 'xinwei' },
    { num: 9, pinyin: 'renshen' },
    { num: 10, pinyin: 'guiyou' },
    { num: 11, pinyin: 'jiaxu' },
    { num: 12, pinyin: 'yihai' },
    { num: 13, pinyin: 'bingzi' },
    { num: 14, pinyin: 'dingchou' },
    { num: 15, pinyin: 'wuyin' },
    { num: 16, pinyin: 'jimao' },
    { num: 17, pinyin: 'gengchen' },
    { num: 18, pinyin: 'xinsi' },
    { num: 19, pinyin: 'renwu' },
    { num: 20, pinyin: 'guiwei' },
    { num: 21, pinyin: 'jiashen' },
    { num: 22, pinyin: 'yiyou' },
    { num: 23, pinyin: 'bingxu' },
    { num: 24, pinyin: 'dinghai' },
    { num: 25, pinyin: 'wuzi' },
    { num: 26, pinyin: 'jichou' },
    { num: 27, pinyin: 'gengyin' },
    { num: 28, pinyin: 'xinmao' },
    { num: 29, pinyin: 'renchen' },
    { num: 30, pinyin: 'guisi' },
    { num: 31, pinyin: 'jiawu' },
    { num: 32, pinyin: 'yiwei' },
    { num: 33, pinyin: 'bingshen' },
    { num: 34, pinyin: 'dingyou' },
    { num: 35, pinyin: 'wuxu' },
    { num: 36, pinyin: 'jihai' },
    { num: 37, pinyin: 'gengzi' },
    { num: 38, pinyin: 'xinchou' },
    { num: 39, pinyin: 'renyin' },
    { num: 40, pinyin: 'guimao' },
    { num: 41, pinyin: 'jiachen' },
    { num: 42, pinyin: 'yisi' },
    { num: 43, pinyin: 'bingwu' },
    { num: 44, pinyin: 'dingwei' },
    { num: 45, pinyin: 'wushen' },
    { num: 46, pinyin: 'jiyou' },
    { num: 47, pinyin: 'gengxu' },
    { num: 48, pinyin: 'xinhai' },
    { num: 49, pinyin: 'renzi' },
    { num: 50, pinyin: 'guichou' },
    { num: 51, pinyin: 'jiayin' },
    { num: 52, pinyin: 'yimao' },
    { num: 53, pinyin: 'bingchen' },
    { num: 54, pinyin: 'dingsi' },
    { num: 55, pinyin: 'wuwu' },
    { num: 56, pinyin: 'jiwei' },
    { num: 57, pinyin: 'gengshen' },
    { num: 58, pinyin: 'xinyou' },
    { num: 59, pinyin: 'renxu' },
    { num: 60, pinyin: 'guihai' }
  ];

  // 生成完整的映射表，包含图片路径
  return baziData.map(item => ({
    id: item.num,
    number: item.num.toString().padStart(2, '0'), // 补零格式，如 "01", "02"
    pinyin: item.pinyin,
    imagePath: `/static/new_bazi/${item.num.toString().padStart(2, '0')}_${item.pinyin}.png`,
    fileName: `${item.num.toString().padStart(2, '0')}_${item.pinyin}.png`
  }));
};

// 生成映射表
const BAZI_IMAGE_MAP = generateBaziImageMap();

/**
 * 根据数字编号获取八字图片信息
 * @param {number} id - 八字编号 (1-60)
 * @returns {Object|null} 八字图片信息对象
 */
const getBaziImageById = (id) => {
  return BAZI_IMAGE_MAP.find(item => item.id === id) || null;
};

/**
 * 根据拼音获取八字图片信息
 * @param {string} pinyin - 拼音名称
 * @returns {Object|null} 八字图片信息对象
 */
const getBaziImageByPinyin = (pinyin) => {
  return BAZI_IMAGE_MAP.find(item => item.pinyin === pinyin) || null;
};

/**
 * 获取所有八字图片映射表
 * @returns {Array} 完整的八字图片映射数组
 */
const getAllBaziImages = () => {
  return BAZI_IMAGE_MAP;
};

/**
 * 根据编号范围获取八字图片列表
 * @param {number} start - 起始编号
 * @param {number} end - 结束编号
 * @returns {Array} 指定范围的八字图片数组
 */
const getBaziImagesByRange = (start, end) => {
  return BAZI_IMAGE_MAP.filter(item => item.id >= start && item.id <= end);
};

module.exports = {
  BAZI_IMAGE_MAP,
  getBaziImageById,
  getBaziImageByPinyin,
  getAllBaziImages,
  getBaziImagesByRange
};
