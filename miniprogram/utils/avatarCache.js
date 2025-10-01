/**
 * 头像缓存工具
 * 基于通用的图片缓存管理器
 */

const { avatarImageCache } = require('./imageCacheManager');

/**
 * 生成头像文件名
 * @param {string} openid 用户openid
 * @param {string} originalFileName 原始文件名
 * @returns {string} 缓存文件名
 */
function generateAvatarFileName(openid, originalFileName) {
  const ext = originalFileName.split('.').pop() || 'jpg';
  return `avatar_${openid}.${ext}`;
}

/**
 * 获取头像路径（优先使用缓存）
 * @param {string} cloudPath 云存储路径
 * @param {string} openid 用户openid
 * @returns {Promise<string>} 头像路径
 */
async function getAvatarPath(cloudPath, openid) {
  const fileName = generateAvatarFileName(openid, cloudPath.split('/').pop() || 'avatar.jpg');
  return await avatarImageCache.getImagePath(cloudPath, fileName);
}

// 导出头像缓存相关方法
module.exports = {
  avatarImageCache,
  generateAvatarFileName,
  getAvatarPath
};
