/**
 * 卡牌图片缓存工具
 * 基于通用的图片缓存管理器
 * 
 * 注意：此文件保留是为了向后兼容，新代码建议直接使用 imageCacheManager
 */

const { cardImageCache } = require('./imageCacheManager');

// 为了向后兼容，导出 imageCacheManager 作为默认导出
const imageCacheManager = cardImageCache;

module.exports = {
  imageCacheManager,
  // 也导出类，以防有代码需要创建新实例
  ImageCacheManager: require('./imageCacheManager').ImageCacheManager
};
