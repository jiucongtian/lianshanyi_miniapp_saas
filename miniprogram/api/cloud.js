/**
 * 云开发API调用模块
 * 注意：此模块已废弃，请使用Service层进行API调用
 * @deprecated 请使用 miniprogram/services/ 中的Service类
 * 
 * 此文件保留仅用于向后兼容，新代码请使用Service层
 * 版本管理功能已集成到BaseService中
 */

const { extractTimeParams } = require('../utils/util');
const { ResponseBean } = require('../beans/ResponseBean');

/**
 * 从日期时间戳提取参数（使用通用工具函数）
 * @param {number} timestamp - 时间戳
 * @returns {Object} 参数对象
 */
function extractTimeParameters(timestamp) {
  return extractTimeParams(timestamp);
}

// 导出工具函数（仍在使用）
module.exports = {
  extractTimeParameters
};