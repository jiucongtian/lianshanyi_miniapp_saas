/**
 * 云开发API调用模块
 * 使用微信云开发调用云函数
 */

const { extractTimeParams } = require('../utils/util');

/**
 * 调用生辰八字计算云函数
 * @param {number} timestamp - 时间戳
 * @returns {Promise} 返回计算结果
 */
async function calculateBazi(timestamp) {
  try {
    console.log('调用云函数calculateBazi，参数:', { timestamp });
    
    // 调用云函数
    const result = await wx.cloud.callFunction({
      name: 'calculateBazi',
      data: {
        timestamp: timestamp
      }
    });

    console.log('云函数返回结果:', result);
    
    if (result.result && result.result.success) {
      return {
        success: true,
        data: result.result.data,
        parameters: result.result.parameters
      };
    } else {
      return {
        success: false,
        error: result.result?.error || '云函数调用失败',
        code: result.result?.code
      };
    }
  } catch (error) {
    console.error('云函数调用失败:', error);
    return {
      success: false,
      error: error.message || '云函数调用失败',
      code: error.errCode || -1
    };
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
 * @param {Object} userData - 用户数据
 * @returns {Promise} 返回操作结果
 */
async function createUser(userData = {}) {
  try {
    console.log('API: 开始调用userManagement云函数，参数:', userData);
    
    const result = await wx.cloud.callFunction({
      name: 'userManagement',
      data: {
        action: 'createUser',
        data: userData
      }
    });

    console.log('API: 云函数调用完成，结果:', result);
    return result.result;
  } catch (error) {
    console.error('API: 创建用户失败:', error);
    return {
      success: false,
      error: error.message || '用户操作失败'
    };
  }
}

/**
 * 获取用户信息
 * @returns {Promise} 返回用户信息
 */
async function getUserInfo() {
  try {
    const result = await wx.cloud.callFunction({
      name: 'userManagement',
      data: {
        action: 'getUserInfo'
      }
    });

    return result.result;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      success: false,
      error: error.message || '获取用户信息失败'
    };
  }
}

/**
 * 更新用户级别（管理员功能）
 * @param {string} targetOpenid - 目标用户openid
 * @param {string} newLevel - 新级别(normal/primary/internal)
 * @param {string} operatorOpenid - 操作员openid
 * @returns {Promise} 返回操作结果
 */
async function updateUserLevel(targetOpenid, newLevel, operatorOpenid) {
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

    return result.result;
  } catch (error) {
    console.error('更新用户级别失败:', error);
    return {
      success: false,
      error: error.message || '更新用户级别失败'
    };
  }
}

/**
 * 按级别查询用户列表
 * @param {string} level - 用户级别(normal/primary/internal)
 * @param {number} limit - 限制数量，默认20
 * @param {number} skip - 跳过数量，默认0
 * @returns {Promise} 返回用户列表
 */
async function getUsersByLevel(level, limit = 20, skip = 0) {
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

    return result.result;
  } catch (error) {
    console.error('查询用户列表失败:', error);
    return {
      success: false,
      error: error.message || '查询用户列表失败'
    };
  }
}

/**
 * 获取用户级别统计
 * @returns {Promise} 返回统计数据
 */
async function getUserLevelStats() {
  try {
    const result = await wx.cloud.callFunction({
      name: 'userManagement',
      data: {
        action: 'getUserLevelStats'
      }
    });

    return result.result;
  } catch (error) {
    console.error('获取用户级别统计失败:', error);
    return {
      success: false,
      error: error.message || '获取用户级别统计失败'
    };
  }
}

/**
 * 档案管理相关API
 */

/**
 * 创建八字档案
 * @param {Object} profileData - 档案数据
 * @returns {Promise} 返回操作结果
 */
async function createProfile(profileData) {
  try {
    const result = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'createProfile',
        data: profileData
      }
    });

    return result.result;
  } catch (error) {
    console.error('创建档案失败:', error);
    return {
      success: false,
      error: error.message || '创建档案失败'
    };
  }
}

/**
 * 获取用户的所有档案
 * @param {Object} queryData - 查询参数
 * @returns {Promise} 返回档案列表
 */
async function getProfiles(queryData = {}) {
  try {
    const result = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'getProfiles',
        data: queryData
      }
    });

    return result.result;
  } catch (error) {
    console.error('获取档案列表失败:', error);
    return {
      success: false,
      error: error.message || '获取档案列表失败'
    };
  }
}

/**
 * 获取单个档案详情
 * @param {string} profileId - 档案ID
 * @returns {Promise} 返回档案详情
 */
async function getProfile(profileId) {
  try {
    const result = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'getProfile',
        data: { profileId }
      }
    });

    return result.result;
  } catch (error) {
    console.error('获取档案详情失败:', error);
    return {
      success: false,
      error: error.message || '获取档案详情失败'
    };
  }
}

/**
 * 根据生日搜索已有档案
 * @param {Object} searchData - 搜索条件
 * @returns {Promise} 返回搜索结果
 */
async function searchProfile(searchData) {
  try {
    const result = await wx.cloud.callFunction({
      name: 'profileManagement',
      data: {
        action: 'searchProfile',
        data: searchData
      }
    });

    return result.result;
  } catch (error) {
    console.error('搜索档案失败:', error);
    return {
      success: false,
      error: error.message || '搜索档案失败'
    };
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
