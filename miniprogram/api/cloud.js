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

module.exports = {
  calculateBazi,
  extractTimeParameters
};
