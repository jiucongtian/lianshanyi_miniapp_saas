/**
 * 云开发API调用模块
 * 使用微信云开发调用云函数
 * 注意：此模块已废弃，请使用Service层进行API调用
 * @deprecated 请使用 miniprogram/services/ 中的Service类
 */

const { extractTimeParams } = require('../utils/util');
const { ResponseBean } = require('../beans/ResponseBean');

/**
 * 调用生辰八字计算云函数（带重试机制）
 * @deprecated 请使用 BaziService.calculateBazi()
 * @param {number} timestamp - 时间戳
 * @param {number} retryCount - 重试次数，默认3次
 * @returns {Promise<ResponseBean>} 返回计算结果
 */
async function calculateBazi(timestamp, retryCount = 3) {
  console.warn('[calculateBazi] 此函数已废弃，请使用 BaziService.calculateBazi()');
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`[calculateBazi] 第${attempt}次尝试，参数:`, { timestamp });
      
      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: 'calculateBazi',
        data: {
          timestamp: timestamp
        }
      });

      console.log('[calculateBazi] 云函数返回结果:', result);
      
      if (result.result && result.result.success) {
        const data = {
          baziData: result.result.baziData,  // 标准化的八字数据
          rawCozeData: result.result.rawCozeData,  // 原始coze数据（用于调试）
          parameters: result.result.parameters,
          timestamp: result.result.timestamp
        };
        return ResponseBean.success(data, '八字计算成功');
      } else {
        // 如果是最后一次尝试，返回错误
        if (attempt === retryCount) {
          return ResponseBean.error(
            result.result?.error || '云函数调用失败',
            result.result?.code || -1
          );
        }
        // 否则继续重试
        console.log(`[calculateBazi] 第${attempt}次尝试失败，准备重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
        continue;
      }
    } catch (error) {
      console.error(`[calculateBazi] 第${attempt}次云函数调用失败:`, error);
      
      // 如果是最后一次尝试，返回错误
      if (attempt === retryCount) {
        return ResponseBean.error(
          error.message || '云函数调用失败',
          error.errCode || -1
        );
      }
      
      // 检查是否是超时错误
      if (error.errCode === -504003) {
        console.log(`[calculateBazi] 第${attempt}次尝试超时，准备重试...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // 超时错误使用更长的延迟
        continue;
      }
      
      // 其他错误，短暂延迟后重试
      console.log(`[calculateBazi] 第${attempt}次尝试失败，准备重试...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * 从日期时间戳提取参数（使用通用工具函数）
 * @param {number} timestamp - 时间戳
 * @returns {Object} 参数对象
 */
function extractTimeParameters(timestamp) {
  return extractTimeParams(timestamp);
}

/**
 * 用户管理相关API
 */

/**
 * 创建或更新用户信息
 * @deprecated 请使用 UserService.createUser()
 * @param {Object} userData - 用户数据
 * @returns {Promise<ResponseBean>} 返回操作结果
 */
async function createUser(userData = {}) {
  console.warn('[createUser] 此函数已废弃，请使用 UserService.createUser()');
  
  try {
    console.log('[createUser] 开始调用userManagement云函数，参数:', userData);
    
    const result = await wx.cloud.callFunction({
      name: 'userManagement',
      data: {
        action: 'createUser',
        data: userData
      }
    });

    console.log('[createUser] 云函数调用完成，结果:', result);
    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[createUser] 创建用户失败:', error);
    return ResponseBean.error(error.message || '用户操作失败', -1);
  }
}

/**
 * 获取用户信息
 * @deprecated 请使用 UserService.getUserInfo()
 * @returns {Promise<ResponseBean>} 返回用户信息
 */
async function getUserInfo() {
  console.warn('[getUserInfo] 此函数已废弃，请使用 UserService.getUserInfo()');
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'userManagement',
      data: {
        action: 'getUserInfo'
      }
    });

    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[getUserInfo] 获取用户信息失败:', error);
    return ResponseBean.error(error.message || '获取用户信息失败', -1);
  }
}

/**
 * 更新用户级别（管理员功能）
 * @deprecated 请使用 UserService.updateUserLevel()
 * @param {string} targetOpenid - 目标用户openid
 * @param {string} newLevel - 新级别(normal/primary/internal)
 * @param {string} operatorOpenid - 操作员openid
 * @returns {Promise<ResponseBean>} 返回操作结果
 */
async function updateUserLevel(targetOpenid, newLevel, operatorOpenid) {
  console.warn('[updateUserLevel] 此函数已废弃，请使用 UserService.updateUserLevel()');
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'userManagement',
      data: {
        action: 'updateUserLevel',
        data: {
          targetOpenid,
          newLevel,
          operatorOpenid
        }
      }
    });

    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[updateUserLevel] 更新用户级别失败:', error);
    return ResponseBean.error(error.message || '更新用户级别失败', -1);
  }
}

/**
 * 按级别查询用户列表
 * @deprecated 请使用 UserService.getUsersByLevel()
 * @param {string} level - 用户级别(normal/primary/internal)
 * @param {number} limit - 限制数量，默认20
 * @param {number} skip - 跳过数量，默认0
 * @returns {Promise<ResponseBean>} 返回用户列表
 */
async function getUsersByLevel(level, limit = 20, skip = 0) {
  console.warn('[getUsersByLevel] 此函数已废弃，请使用 UserService.getUsersByLevel()');
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'userManagement',
      data: {
        action: 'getUsersByLevel',
        data: {
          level,
          limit,
          skip
        }
      }
    });

    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[getUsersByLevel] 查询用户列表失败:', error);
    return ResponseBean.error(error.message || '查询用户列表失败', -1);
  }
}

/**
 * 获取用户级别统计
 * @deprecated 请使用 UserService.getUserLevelStats()
 * @returns {Promise<ResponseBean>} 返回统计数据
 */
async function getUserLevelStats() {
  console.warn('[getUserLevelStats] 此函数已废弃，请使用 UserService.getUserLevelStats()');
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'userManagement',
      data: {
        action: 'getUserLevelStats'
      }
    });

    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[getUserLevelStats] 获取用户级别统计失败:', error);
    return ResponseBean.error(error.message || '获取用户级别统计失败', -1);
  }
}

/**
 * 档案管理相关API
 */

/**
 * 创建八字档案
 * @deprecated 请使用 ProfileService.createProfile()
 * @param {Object} profileData - 档案数据
 * @returns {Promise<ResponseBean>} 返回操作结果
 */
async function createProfile(profileData) {
  console.warn('[createProfile] 此函数已废弃，请使用 ProfileService.createProfile()');
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'createProfile',
        data: profileData
      }
    });

    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[createProfile] 创建档案失败:', error);
    return ResponseBean.error(error.message || '创建档案失败', -1);
  }
}

/**
 * 获取用户的所有档案
 * @deprecated 请使用 ProfileService.getProfiles()
 * @param {Object} queryData - 查询参数
 * @returns {Promise<ResponseBean>} 返回档案列表
 */
async function getProfiles(queryData = {}) {
  console.warn('[getProfiles] 此函数已废弃，请使用 ProfileService.getProfiles()');
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'getProfiles',
        data: queryData
      }
    });

    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[getProfiles] 获取档案列表失败:', error);
    return ResponseBean.error(error.message || '获取档案列表失败', -1);
  }
}

/**
 * 获取单个档案详情
 * @deprecated 请使用 ProfileService.getProfile()
 * @param {string} profileId - 档案ID
 * @returns {Promise<ResponseBean>} 返回档案详情
 */
async function getProfile(profileId) {
  console.warn('[getProfile] 此函数已废弃，请使用 ProfileService.getProfile()');
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'getProfile',
        data: { profileId }
      }
    });

    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[getProfile] 获取档案详情失败:', error);
    return ResponseBean.error(error.message || '获取档案详情失败', -1);
  }
}

/**
 * 根据生日搜索已有档案
 * @deprecated 请使用 ProfileService.searchProfile()
 * @param {Object} searchData - 搜索条件
 * @returns {Promise<ResponseBean>} 返回搜索结果
 */
async function searchProfile(searchData) {
  console.warn('[searchProfile] 此函数已废弃，请使用 ProfileService.searchProfile()');
  
  try {
    const result = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'searchProfile',
        data: searchData
      }
    });

    return ResponseBean.fromCloudResult(result);
  } catch (error) {
    console.error('[searchProfile] 搜索档案失败:', error);
    return ResponseBean.error(error.message || '搜索档案失败', -1);
  }
}

module.exports = {
  calculateBazi,
  extractTimeParameters,
  // 用户管理
  createUser,
  getUserInfo,
  updateUserLevel,
  getUsersByLevel,
  getUserLevelStats,
  // 档案管理
  createProfile,
  getProfiles,
  getProfile,
  searchProfile
};
