const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

let configCache = null;
let cacheTime = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

/**
 * 获取用户类型配置（带缓存）
 * @param {string} typeCode - 用户类型代码
 * @returns {Promise<Object>} 配置对象
 */
async function getUserTypeConfig(typeCode) {
  // 检查缓存
  if (configCache && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
    if (configCache[typeCode]) {
      console.log('[getUserTypeConfig] 使用缓存配置:', typeCode);
      return configCache[typeCode];
    }
  }
  
  try {
    console.log('[getUserTypeConfig] 从数据库获取配置:', typeCode);
    const result = await db.collection('static_user_types')
      .where({ typeCode })
      .get();
    
    if (result.data.length > 0) {
      const config = result.data[0];
      
      // 更新缓存
      if (!configCache) configCache = {};
      configCache[typeCode] = config;
      cacheTime = Date.now();
      
      return config;
    }
  } catch (error) {
    console.error('[getUserTypeConfig] 获取配置失败:', error);
  }
  
  // 返回默认配置
  return getDefaultConfig(typeCode);
}

/**
 * 获取默认配置
 * @param {string} typeCode - 用户类型代码
 * @returns {Object} 默认配置对象
 */
function getDefaultConfig(typeCode) {
  const defaultConfigs = {
    guest: {
      typeCode: 'guest',
      typeName: '临时用户',
      displayName: '临时用户',
      description: '未注册的临时用户，功能受限',
      profileQuota: 3,
      permissions: ['view', 'create_limited']
    },
    normal: {
      typeCode: 'normal',
      typeName: '探索者',
      displayName: '探索者',
      description: '已注册的普通用户，享受基础功能',
      profileQuota: 50,
      permissions: ['view', 'create']
    },
    premium: {
      typeCode: 'premium',
      typeName: '高级用户',
      displayName: '高级用户',
      description: '付费高级用户，享受全部功能',
      profileQuota: -1,
      permissions: ['all']
    }
  };
  
  return defaultConfigs[typeCode] || defaultConfigs.guest;
}

/**
 * 清除缓存
 */
function clearCache() {
  configCache = null;
  cacheTime = null;
  console.log('[clearCache] 用户类型配置缓存已清除');
}

/**
 * 获取用户权限和配额信息
 * @param {Object} user - 用户对象
 * @returns {Promise<Object>} 权限和配额信息
 */
async function getUserPermissionsAndQuota(user) {
  const userType = user.userType || user.userTypeCode || 'guest';
  
  // 优先使用static_user_types表的配置
  const typeConfig = await getUserTypeConfig(userType);
  
  // 直接使用配置表的权限和配额，不再使用users表中的旧字段
  return {
    userType,
    typeName: typeConfig.typeName,
    displayName: typeConfig.displayName,
    description: typeConfig.description,
    profileQuota: typeConfig.profileQuota,
    permissions: typeConfig.permissions
  };
}

module.exports = {
  getUserTypeConfig,
  getDefaultConfig,
  clearCache,
  getUserPermissionsAndQuota
};
